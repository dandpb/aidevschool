import { chromium } from '../../engines/codexdojo-os-prototype/node_modules/@playwright/test/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'

const baseURL = 'https://6a8e4946e0a6aeca65a0ce65--aidevschool-codexdojo-os.netlify.app'
const outputDir = new URL('./', import.meta.url)
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const result = { baseURL, consoleErrors: [] }
page.on('console', (message) => {
  if (message.type() === 'error') result.consoleErrors.push(message.text())
})

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
  await mission.getByTestId('retry').click()
  result.retryState = await frame.evaluate(() => ({
    phase: window.__warehouse.game.snapshot.phase,
    pendingIndex: window.__warehouse.game.snapshot.pendingIndex,
  }))
  await play(true)
  result.successStatus = await mission.getByTestId('hud-status').textContent()
  result.rawEvidence = await frame.evaluate(() => window.__voxelDojoEvidence ?? [])
  result.indexedDb = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os-verification', 2)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const request = database.transaction('raw-evidence-v2').objectStore('raw-evidence-v2').getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => { database.close(); resolve(request.result) }
    }
  }))
  result.approvedVisible = await page.getByText('Verificação independente aprovada', { exact: true }).isVisible()
  result.rejectedVisible = await page.getByText('Evidência rejeitada', { exact: true }).isVisible()
  result.pass = result.rawEvidence.length === 2
    && result.indexedDb.length === 2
    && result.indexedDb.some((record) => record.status === 'verified')
    && result.approvedVisible && !result.rejectedVisible && result.hasWebGL
  await page.screenshot({ path: new URL('final-state.png', outputDir).pathname, fullPage: true })
} catch (error) {
  result.pass = false
  result.error = error instanceof Error ? error.stack : String(error)
} finally {
  await writeFile(new URL('qa-result.json', outputDir), `${JSON.stringify(result, null, 2)}\n`)
  await browser.close()
}

if (!result.pass) process.exitCode = 1
