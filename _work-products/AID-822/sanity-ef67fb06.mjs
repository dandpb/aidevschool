// §0.b moderator sanity session (AID-822; re-pin rule runbook AID-641 §0 / kit AID-639 §2.2)
// Surface: production alias @ pin ef67fb06 (C1 promotion, AID-821).
// Path per AID-822/AID-804: navigation warmup (/onboarding, /hub, /map, /progress — must NOT
// expose retrofitted l15–l17) -> hosted missions l27 -> l28 -> l29 (correct answers, independent
// host verifier PASS) -> hub return. 0 console errors expected.
// Same driver pattern as AID-777 (_work-products attachment ace28432).
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const require = createRequire(new URL('../../engines/codexdojo-os-prototype/package.json', import.meta.url))
const { chromium } = require('playwright')

const BASE = 'https://aidevschool-codexdojo-os.netlify.app'
const EXPECT_PIN = 'ef67fb06be7d8eb6ff3fe8d16e9c65024d4ac118'
const EXPECT_MANIFEST_SHA = '1f79089d3b3683727f92e9e094111223a24ed132612579b21ef4aee09102adf2'
const EXPECT_OS_SHA = 'f605b3c611c65424752fbf10b9497cdfbb7e90f9f2f3d9c3e6fe3c2380a06157'
const EXPECT_CONTENT_VERSION = '2026-09-04.1'
const RETROFIT_TOKENS = /\b(l15|l16|l17)\b/g

const results = { base: BASE, expectPin: EXPECT_PIN, checks: [], missions: [], startedAt: new Date().toISOString() }
const check = (name, ok, detail = '') => {
  results.checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sha = (s) => createHash('sha256').update(s).digest('hex')

// ---------- 1. Identity first-hand (alias == promotion receipt AID-821) ----------
const mres = await fetch(`${BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('manifest-sha256==receipt-1f79089d', sha(mbody) === EXPECT_MANIFEST_SHA, sha(mbody).slice(0, 16))
check('manifest-sourceRevision==ef67fb06', manifest.sourceRevision === EXPECT_PIN, manifest.sourceRevision)
check('manifest-os-sha256==receipt-f605b3c6', manifest.surfaces?.os?.sha256 === EXPECT_OS_SHA, manifest.surfaces?.os?.sha256?.slice(0, 16))

const html = await (await fetch(`${BASE}/`)).text()
const mainAsset = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1]
const bundle = await (await fetch(`${BASE}${mainAsset}`)).text()
const cvAll = bundle.match(/2026-09-\d{1,2}\.\d+/g) || []
const cvUniform = cvAll.length > 0 && cvAll.every((v) => v === EXPECT_CONTENT_VERSION)
check('contentVersion-uniform-2026-09-04.1', cvUniform, `${cvAll.length} strings, distinct: ${[...new Set(cvAll)].join(',') || 'none'}`)

// ---------- 2. Browser session ----------
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })

async function toPass(fn, timeout = 20000) {
  const start = Date.now()
  let lastErr
  while (Date.now() - start < timeout) {
    try { return await fn() } catch (e) { lastErr = e; await page.waitForTimeout(300) }
  }
  throw lastErr
}
async function checkControl(mission, testId) {
  const input = mission.getByTestId(testId)
  await toPass(async () => {
    if (!(await input.isChecked())) await input.locator('xpath=ancestor::label[1]').click()
    if (!(await input.isChecked())) throw new Error(`${testId} not checked after click`)
  })
}
const ARIA = async () => page.getByRole('status').first().textContent().catch(() => null)

// 2a. Onboarding (Dev track, continuista-style fresh visitor) -> hub
{
  const t0 = Date.now()
  await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Para programadores/ }).click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await toPass(async () => { if (!page.url().includes('/hub')) throw new Error('not in hub') })
  results.onboarding = { ms: Date.now() - t0, landedOn: page.url() }
  console.log(`ONBOARDING(dev): ${results.onboarding.ms}ms -> ${page.url()}`)
}

// 2b. Navigation warmup surfaces render AND do not expose retrofitted l15/l16/l17 (AID-804 property on the new surface)
async function warmupSurface(path, waitText) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await toPass(async () => {
    const t = await page.textContent('body').catch(() => '')
    if (!t.includes(waitText)) throw new Error(`wait text missing: ${waitText}`)
  })
  await page.waitForTimeout(400)
  const text = (await page.textContent('body').catch(() => '')) || ''
  const dom = (await page.evaluate(() => document.documentElement.outerHTML).catch(() => '')) || ''
  const textHits = text.match(RETROFIT_TOKENS) || []
  const domHits = dom.match(/dev\/l1[567]\b/g) || []
  check(`warmup-${path}-rendered`, text.trim().length > 100, `${text.trim().length} chars`)
  check(`warmup-${path}-no-l15-l17-text`, textHits.length === 0, textHits.slice(0, 5).join(','))
  check(`warmup-${path}-no-dev-l15-l17-refs`, domHits.length === 0, domHits.slice(0, 5).join(','))
  results.warmup = results.warmup || {}
  results.warmup[path] = { chars: text.trim().length, textHits, domHits }
}
await warmupSurface('/hub', 'Seu próximo passo está pronto')
await warmupSurface('/map', 'Mapa de missões')
await warmupSurface('/progress', 'Progresso com fonte visível')

// 2c. Hosted missions l27 -> l28 -> l29 (fixed order, correct answers — same as AID-777)
async function runMission(missionId, title, drive) {
  const t0 = Date.now()
  await page.goto(`${BASE}/mission/dev/${missionId}`, { waitUntil: 'domcontentloaded' })
  await toPass(async () => {
    const h = page.getByRole('heading', { name: title })
    if (!(await h.isVisible())) throw new Error('heading not visible')
  })
  const mission = page.frameLocator('.mission-runtime iframe')
  await toPass(async () => {
    if (!(await mission.getByTestId('start-lesson').isVisible())) throw new Error('start-lesson not visible')
  }, 30000)
  const iframeSrc = await page.locator('.mission-runtime iframe').getAttribute('src')
  check(`${missionId}-iframe-same-origin`, iframeSrc.startsWith(BASE), iframeSrc.slice(0, 60))
  await mission.getByTestId('start-lesson').click()
  const perActivity = []
  for (const [index, act] of drive.entries()) {
    const a0 = Date.now()
    await act(mission)
    await mission.getByTestId('submit-attempt').click()
    if (index === drive.length - 1) {
      await toPass(() => mission.getByTestId('finish-lesson').click({ timeout: 3000 }))
    } else {
      await toPass(async () => {
        const btn = mission.getByTestId('next-activity')
        if (!(await btn.isVisible())) throw new Error('next-activity not visible')
        await btn.click({ timeout: 3000 })
      })
    }
    perActivity.push({ attempt: act.name, ms: Date.now() - a0 })
  }
  const hub = page.getByRole('button', { name: 'Voltar ao hub', exact: true })
  await toPass(async () => { if (!(await hub.isEnabled())) throw new Error('hub disabled') }, 30000)
  const aria = await ARIA()
  const verdictEl = page.getByTestId('independent-verdict')
  const hostVerdict = (await verdictEl.textContent().catch(() => '')) || ''
  check(`${missionId}-host-independent-verdict-PASS`, /PASS/i.test(hostVerdict), hostVerdict.trim())
  const rec = { missionId, ms: Date.now() - t0, iframeSrc, ariaLiveAtCompletion: (aria || '').trim().slice(0, 160), hostVerdict: hostVerdict.trim(), perActivity }
  results.missions.push(rec)
  console.log(`MISSION ${missionId}: ${(rec.ms / 1000).toFixed(1)}s | host verdict: ${rec.hostVerdict}`)
  await hub.click()
}

// ---- l27: a1 sort, a2 prompt_builder, a3 missing_context
const l27order = ['passo-reproduzir', 'passo-isolar', 'passo-pedir', 'passo-corrigir', 'passo-testar']
await runMission('l27', 'Debug com assistente: reproduza antes de perguntar', [
  async function a1_sort(mission) {
    const readOrder = async () => mission.locator('[data-testid^="sort-item-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('sort-item-', '')))
    const ids = await readOrder()
    for (const [target, expectedId] of l27order.entries()) {
      const presses = ids.indexOf(expectedId) - target
      const dir = presses >= 0 ? 'up' : 'down'
      for (let p = 0; p < Math.abs(presses); p += 1) await mission.getByTestId(`sort-${dir}-${expectedId}`).click()
      ids.splice(ids.indexOf(expectedId), 1); ids.splice(target, 0, expectedId)
    }
    const final = await readOrder()
    if (final.join(',') !== l27order.join(',')) throw new Error(`sort mismatch: ${final.join(',')}`)
  },
  async function a2_prompt_builder(mission) {
    await mission.getByTestId('field-erro').fill('TypeError: Cannot read properties of undefined (reading valor) — stack completo do erro anexado')
    await mission.getByTestId('field-reproduz').fill('Abro o formulário noturno, deixo o anexo vazio e clico aprovar — o passo reproduz o erro sempre')
    await mission.getByTestId('field-esperado-vs-observado').fill('Esperado: aprova o reembolso; observado: retorna TypeError')
  },
  async function a3_missing_context(mission) {
    for (const id of ['mensagem-de-erro', 'passo-que-reproduz', 'comportamento-esperado']) await checkControl(mission, `context-${id}`)
  },
])

// ---- l28: a1 choice, a2 rubric_review, a3 output_comparison
await runMission('l28', 'Refatore com assistente sem quebrar comportamento', [
  async function a1_choice(mission) { await checkControl(mission, 'option-opt-a') },
  async function a2_rubric(mission) {
    for (const [cid, v] of Object.entries({ 'c-preserva-comportamento': 'partial', 'c-passos-pequenos': 'not_met', 'c-testes-apos-cada-passo': 'not_met', 'c-escopo-minimo': 'not_met' })) {
      await checkControl(mission, `rubric-${cid}-${v}`)
    }
  },
  async function a3_output_comparison(mission) {
    await checkControl(mission, 'output-out-a')
    for (const cid of ['c-preserva-comportamento', 'c-verificavel-por-etapas']) await checkControl(mission, `criterion-${cid}`)
  },
])

// ---- l29: a1 choice multi, a2 rubric_review, a3 missing_context
await runMission('l29', 'Avalie as dependências sugeridas', [
  async function a1_choice_multi(mission) {
    for (const id of ['opt-manutencao', 'opt-licenca', 'opt-seguranca', 'opt-alternativa-nativa']) await checkControl(mission, `option-${id}`)
  },
  async function a2_rubric(mission) {
    for (const [cid, v] of Object.entries({ 'c-compara-com-alternativa-nativa': 'not_met', 'c-verifica-manutencao': 'not_met', 'c-verifica-licenca': 'met', 'c-verifica-seguranca': 'not_met', 'c-escopo-da-dependencia': 'met' })) {
      await checkControl(mission, `rubric-${cid}-${v}`)
    }
  },
  async function a3_missing_context(mission) {
    for (const id of ['manutencao-atual', 'licenca-do-pacote', 'avisos-de-seguranca']) await checkControl(mission, `context-${id}`)
  },
])

// ---------- 3. Post: hub intact, zero console errors ----------
const hubText = await page.textContent('body').catch(() => '')
check('hub-rendered-after-l29', hubText.trim().length > 100, `${hubText.trim().length} chars`)
check('zero-console-errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))
results.consoleErrors = consoleErrors
results.completedAt = new Date().toISOString()
results.happyPathMs = results.missions.reduce((a, m) => a + m.ms, 0) + (results.onboarding?.ms || 0)

const failed = results.checks.filter((c) => !c.ok).length
results.verdict = failed === 0 && results.missions.length === 3 ? 'PASS' : 'FAIL'
console.log(`\nSUMMARY: missions=${results.missions.length}/3 checks=${results.checks.length} failed=${failed} verdict=${results.verdict} happyPath=${(results.happyPathMs / 1000).toFixed(1)}s`)
writeFileSync(new URL('./sanity-ef67fb06.result.json', import.meta.url), JSON.stringify(results, null, 2))
await browser.close()
process.exit(failed === 0 ? 0 : 1)
