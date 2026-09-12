import { chromium } from '../../engines/codexdojo-os-prototype/node_modules/@playwright/test/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'

const baseURL = 'https://6a8e4946e0a6aeca65a0ce65--aidevschool-codexdojo-os.netlify.app'
const outputDir = new URL('./', import.meta.url)
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

const result = { baseURL, consoleErrors }
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
  result.documentTitle = await frame.title()
  result.hasWebGL = await frame.evaluate(() => {
    const canvas = document.querySelector('#stage')
    return canvas instanceof HTMLCanvasElement
      && (canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null)
  })

  const state = () => frame.evaluate(() => {
    const hook = window.__warehouse
    if (!hook) throw new Error('__warehouse ausente')
    return {
      phase: hook.game.snapshot.phase,
      keys: hook.game.snapshot.keys,
      pendingIndex: hook.game.snapshot.pendingIndex,
    }
  })

  const initial = await state()
  for (let index = 0; index < initial.keys.length; index += 1) {
    const wrongShelf = await frame.evaluate(() => {
      const hook = window.__warehouse
      const snapshot = hook.game.snapshot
      const key = snapshot.keys[snapshot.pendingIndex]
      return (hook.game.shelfOfKey(key) + 1) % snapshot.store.shelfCount
    })
    await mission.getByTestId(`shelf-${wrongShelf}`).click()
  }
  result.failedStatus = await mission.getByTestId('hud-status').textContent()
  result.evidenceAfterFailure = await frame.evaluate(() => window.__voxelDojoEvidence ?? [])

  await mission.getByTestId('retry').click()
  const retry = await state()
  result.retryState = { phase: retry.phase, pendingIndex: retry.pendingIndex }
  for (let index = 0; index < retry.keys.length; index += 1) {
    const shelf = await frame.evaluate(() => {
      const hook = window.__warehouse
      const snapshot = hook.game.snapshot
      const key = snapshot.keys[snapshot.pendingIndex]
      return hook.game.shelfOfKey(key)
    })
    await mission.getByTestId(`shelf-${shelf}`).click()
  }

  result.successStatus = await mission.getByTestId('hud-status').textContent()
  result.rawEvidence = await frame.evaluate(() => window.__voxelDojoEvidence ?? [])
  result.verificationText = await page.locator('body').innerText()
  result.indexedDb = await page.evaluate(async () => new Promise((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os-verification', 2)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const request = database.transaction('raw-evidence-v2').objectStore('raw-evidence-v2').getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => { database.close(); resolve(request.result) }
    }
  }))
  result.approvedVisible = await page.getByText(
    'Verificação independente aprovada', { exact: true },
  ).isVisible()
  result.rejectedVisible = await page.getByText('Evidência rejeitada', { exact: true }).isVisible()
  await page.screenshot({ path: new URL('warehouse-pass.png', outputDir).pathname, fullPage: true })
  result.pass = result.failedStatus?.includes('failed')
    && result.retryState.phase === 'predicting'
    && result.retryState.pendingIndex === 0
    && result.successStatus?.includes('cleared')
    && result.rawEvidence.length === 2
    && result.indexedDb.some((record) => record.status === 'verified')
    && result.approvedVisible
    && !result.rejectedVisible
    && result.hasWebGL
} catch (error) {
  result.pass = false
  result.error = error instanceof Error ? error.stack : String(error)
  await page.screenshot({ path: new URL('warehouse-failure.png', outputDir).pathname, fullPage: true })
} finally {
  await writeFile(new URL('qa-result.json', outputDir), `${JSON.stringify(result, null, 2)}\n`)
  await browser.close()
}

if (!result.pass) process.exitCode = 1
