import { chromium } from '../../engines/codexdojo-os-prototype/node_modules/@playwright/test/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'

const baseURL = process.env.QA_BASE_URL
  ?? 'https://6a8f468d77062339d57476d5--aidevschool-codexdojo-os.netlify.app'
const outputDir = process.env.QA_OUTPUT_DIR
  ? new URL(`${process.env.QA_OUTPUT_DIR.replace(/\/$/, '')}/`, `file://${process.cwd()}/`)
  : new URL('./', import.meta.url)
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const result = { baseURL, consoleErrors: [], failedRequests: [], verificationResponses: [] }
page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(message.text())
})
page.on('requestfailed', (request) => {
  result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText })
})
page.on('response', async (response) => {
  if (!response.url().includes('verify')) return
  result.verificationResponses.push({
    url: response.url(),
    status: response.status(),
    contentType: response.headers()['content-type'],
    body: await response.text().catch(() => '<unreadable>'),
  })
})

const readVerificationDatabase = () => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('codexdojo-os-verification', 2)
  open.onerror = () => reject(open.error)
  open.onsuccess = () => {
    const database = open.result
    const stores = ['raw-evidence-v2', 'verification-receipts']
    const transaction = database.transaction(stores)
    const output = {}
    let remaining = stores.length
    for (const store of stores) {
      const request = transaction.objectStore(store).getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        output[store] = request.result
        remaining -= 1
        if (remaining === 0) {
          database.close()
          resolve(output)
        }
      }
    }
  }
}))

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Trilha técnica.*Dev/ }).click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Revisar agora' }).click()

  const mission = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]')
  await mission.getByTestId('shelf-0').waitFor({ state: 'visible', timeout: 30_000 })
  const frame = page.frames().find((candidate) => candidate.url().includes('/apps/warehouse/'))
  if (!frame) throw new Error('iframe WAREHOUSE não carregou')
  result.frameURL = frame.url()
  result.hasWebGL = await frame.evaluate(() => {
    const canvas = document.querySelector('#stage')
    return canvas instanceof HTMLCanvasElement && Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  })

  const play = async (correct) => {
    const keyCount = await frame.evaluate(() => window.__warehouse.game.snapshot.keys.length)
    for (let index = 0; index < keyCount; index += 1) {
      const shelf = await frame.evaluate((isCorrect) => {
        const hook = window.__warehouse
        const snapshot = hook.game.snapshot
        const expected = hook.game.shelfOfKey(snapshot.keys[snapshot.pendingIndex])
        return isCorrect ? expected : (expected + 1) % snapshot.store.shelfCount
      }, correct)
      await mission.getByTestId(`shelf-${shelf}`).click()
    }
  }

  await play(false)
  result.failedStatus = await mission.getByTestId('hud-status').textContent()
  await page.waitForTimeout(500)
  result.databaseAfterFail = await readVerificationDatabase()

  await mission.getByTestId('retry').click()
  result.retryState = await frame.evaluate(() => ({
    phase: window.__warehouse.game.snapshot.phase,
    pendingIndex: window.__warehouse.game.snapshot.pendingIndex,
  }))
  await play(true)
  result.successStatus = await mission.getByTestId('hud-status').textContent()
  await page.waitForTimeout(3_000)

  result.rawEvidence = await frame.evaluate(() => window.__voxelDojoEvidence ?? [])
  result.databaseFinal = await readVerificationDatabase()
  result.approvedVisible = await page.getByText('Verificação independente aprovada', { exact: true }).isVisible()
  result.rejectedVisible = await page.getByText('Evidência rejeitada', { exact: true }).isVisible()

  const entries = result.databaseFinal['raw-evidence-v2']
  const receipts = result.databaseFinal['verification-receipts']
  const failEntry = entries.find((entry) => entry.record?.pass === false)
  const passEntry = entries.find((entry) => entry.record?.pass === true)
  const passReceipt = receipts.find((entry) => entry.evidenceDigest === passEntry?.evidenceDigest)
  result.assertions = {
    twoRawAttempts: entries.length === 2,
    sameMissionRun: Boolean(failEntry && passEntry && failEntry.missionRunId === passEntry.missionRunId),
    distinctEvidenceIds: Boolean(failEntry && passEntry && failEntry.evidenceId && passEntry.evidenceId && failEntry.evidenceId !== passEntry.evidenceId),
    failPreserved: failEntry?.status === 'verified' && failEntry?.record?.pass === false,
    passVerified: passEntry?.status === 'verified' && passEntry?.record?.pass === true,
    passReceiptCorrelated: Boolean(passReceipt && passReceipt.storageId === passEntry.storageId && passReceipt.receipt?.verdict === 'PASS'),
    canonicalGateNotSubmitted: passReceipt?.receipt?.canonical_gate_status === 'not-submitted',
  }
  result.pass = result.hasWebGL && result.approvedVisible && !result.rejectedVisible
    && Object.values(result.assertions).every(Boolean)
  await page.screenshot({ path: new URL('final-state.png', outputDir).pathname, fullPage: true })
} catch (error) {
  result.pass = false
  result.error = error instanceof Error ? error.stack : String(error)
  await page.screenshot({ path: new URL('failure-state.png', outputDir).pathname, fullPage: true }).catch(() => {})
} finally {
  await writeFile(new URL('qa-result.json', outputDir), `${JSON.stringify(result, null, 2)}\n`)
  await browser.close()
}

if (!result.pass) process.exitCode = 1
