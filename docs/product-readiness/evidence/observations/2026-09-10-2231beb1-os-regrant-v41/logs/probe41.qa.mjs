// Text-dump probe: qualify walk41 heuristic flags (result/warehouse/reentry) against real page text.
import { chromium } from '@playwright/test'

const BASE = 'http://127.0.0.1:4180'
const page_wait = (ms) => new Promise((r) => setTimeout(r, ms))

function fmix32(h) { let x = h; x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return x >>> 0 }
function hashKey(key) { let h = 0x811c9dc5; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) } return fmix32(h) >>> 0 }
const bucketOf = (key, n) => hashKey(key) % n

async function checkControl(mission, testId) {
  const input = mission.getByTestId(testId)
  const card = input.locator('xpath=ancestor::label[1]')
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await input.isChecked()) return
    await card.click({ timeout: 2000 }).catch(() => {})
    await page_wait(300)
  }
  if (!(await input.isChecked())) throw new Error(`control not checkable: ${testId}`)
}

async function completeSort(mission, expectedOrder) {
  const current = await mission.locator('[data-testid^="sort-up-"]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('data-testid').replace('sort-up-', '')))
  const state = [...current]
  for (const [target, expectedId] of expectedOrder.entries()) {
    const presses = state.indexOf(expectedId) - target
    const direction = presses >= 0 ? 'up' : 'down'
    for (let p = 0; p < Math.abs(presses); p += 1) await mission.getByTestId(`sort-${direction}-${expectedId}`).click()
    state.splice(state.indexOf(expectedId), 1)
    state.splice(target, 0, expectedId)
  }
}

async function answerWarehouseUI(frame, correct) {
  const status = frame.getByTestId('hud-status')
  const first = await status.textContent()
  const count = first?.match(/de (\d+):/)?.[1]
  if (count === undefined) throw new Error('crate count not visible')
  const shelfCount = await frame.locator('[data-testid^="shelf-"]').count()
  for (let index = 0; index < Number(count); index += 1) {
    const current = await status.textContent()
    const key = current?.match(/: (.+) — clique/)?.[1]
    if (key === undefined) throw new Error('key not visible')
    const expected = bucketOf(key, shelfCount)
    await frame.getByTestId(`shelf-${correct ? expected : (expected + 1) % shelfCount}`).dispatchEvent('click')
  }
}

const dump = (label, text) => { console.log(`\n===== ${label} =====`); console.log(text.slice(0, 2600)) }

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' }).waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: /Começar missão|Continuar missão/ }).click()
  await page.locator('.mission-runtime iframe').waitFor({ timeout: 20000 })
  const mission = page.frameLocator('.mission-runtime iframe')
  await mission.getByTestId('start-lesson').waitFor({ timeout: 20000 })
  await mission.getByTestId('start-lesson').click()
  await checkControl(mission, 'output-out-b')
  await checkControl(mission, 'criterion-c-fontes')
  await checkControl(mission, 'criterion-c-limites')
  await mission.getByTestId('submit-attempt').click()
  await page_wait(500)
  await mission.getByTestId('next-activity').click()
  await checkControl(mission, 'option-opt-verifica-na-fonte')
  await mission.getByTestId('submit-attempt').click()
  await page_wait(500)
  await mission.getByTestId('next-activity').click()
  await completeSort(mission, ['fluxo-resposta', 'fluxo-afirmacoes', 'fluxo-fonte', 'fluxo-conferencia', 'fluxo-uso'])
  await mission.getByTestId('submit-attempt').click()
  await page_wait(500)
  await mission.getByTestId('finish-lesson').click()
  await page_wait(800)
  dump('LITERACY-RESULT', await page.locator('body').innerText())
  const backToHub = page.getByRole('button', { name: 'Voltar ao hub', exact: true })
  await backToHub.waitFor({ timeout: 15000 }); await backToHub.click(); await page_wait(800)

  await page.goto(BASE + '/mission/dev/game-02-warehouse')
  await page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' }).waitFor({ timeout: 20000 })
  await page.locator('.mission-runtime iframe').waitFor({ timeout: 30000 })
  const wf = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]')
  await wf.getByTestId('hud-status').waitFor({ timeout: 30000 })
  await page_wait(500)
  await answerWarehouseUI(wf, false)
  await page_wait(800)
  dump('WAREHOUSE-WRONG-FRAME', await wf.locator('body').innerText().catch(() => '<n/a>'))
  await wf.getByTestId('retry').dispatchEvent('click')
  await page_wait(500)
  await answerWarehouseUI(wf, true)
  await page_wait(1500)
  dump('WAREHOUSE-COMPLETE-PAGE', await page.locator('body').innerText())
  const back2 = page.getByRole('button', { name: 'Voltar ao hub', exact: true })
  await back2.click(); await page_wait(800)
  await page.goto(BASE + '/mission/dev/game-02-warehouse')
  await page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' }).waitFor({ timeout: 20000 })
  await page.locator('.mission-runtime iframe').waitFor({ timeout: 30000 })
  await page_wait(1200)
  dump('WAREHOUSE-REENTRY-PAGE', await page.locator('body').innerText())
  await browser.close()
  console.log('\nPROBE DONE')
}
main().catch((e) => { console.error('PROBE FAILED:', e); process.exit(1) })
