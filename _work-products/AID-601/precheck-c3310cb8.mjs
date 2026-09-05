// AID-601 wave O2 l24-l26 promotion pre-check (adapted from AID-532 precheck-aa4d6c5.mjs / AID-462 / AID-440)
// Expected pin: c3310cb8 (PR #238 merge — mod-07 "IA além do texto" wave, map 30->33)
// Delta vs aa4d6c5: three new hosted ai-pratica literacy missions (l24/l25/l26, ch18-20),
// contentVersion 2026-09-01.1 -> 2026-09-02.1 (single bump traveled with T1/l24),
// map = 33 (26 literacy + 7 games), ia_pratica = 20, literacy bridge dispatches the
// wave activity types (output_comparison first ai-pratica production use; sort,
// safety_classification, missing_context, choice), prompt_builder probe proves
// fail-closed honesty for free text.
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const require = createRequire('/tmp/opencode/promo601/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL.replace(/\/$/, "")
const PIN = 'c3310cb8bb20cda236e84e823dfd25c0d7981979'
const MANIFEST_SHA = '6d187275a2383f50d79ffba47574927c7780699ff4f5759b87fe7d3f054c8304'
const OS_SHA = '271a9238ff60286edcbf92ea386a9fe056b77497268293f44d33bdf81b7722aa'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')

// 1. remote manifest identity
const mres = await fetch(`${BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('manifest-sha256', mres.ok && sha(mbody) === MANIFEST_SHA, sha(mbody))
check('manifest-sourceRevision', manifest.sourceRevision === PIN, manifest.sourceRevision)
check('manifest-os-bytes', manifest.surfaces.os.sha256 === OS_SHA, manifest.surfaces.os.sha256.slice(0, 16))

// 2. surfaces reachable (19 bundled apps + os)
const APPS = ['literacydojo', 'warehouse', 'wormhole', 'relay-station', 'pipeline-plant', 'checkpoint-city', 'timeline-tower', 'docking-bay', 'pixelquest', 'dojotoday', 'hash-ring', 'air-traffic', 'mission-control', 'breaker-grid', 'river-delta', 'observatory', 'freight-yard', 'lighthouse-network', 'stacks']
for (const p of ['/', ...APPS.map((a) => `/apps/${a}/`)]) {
  const r = await fetch(BASE + p)
  check(`surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. OS bundle embeds same-origin pins, not stale/development fallbacks
const osJsPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
const ENV_PINS = { VITE_LITERACYDOJO_URL: 'literacydojo', VITE_WAREHOUSE_URL: 'warehouse', VITE_WORMHOLE_URL: 'wormhole', VITE_RELAY_STATION_URL: 'relay-station', VITE_PIPELINE_PLANT_URL: 'pipeline-plant', VITE_CHECKPOINT_CITY_URL: 'checkpoint-city', VITE_TIMELINE_TOWER_URL: 'timeline-tower', VITE_DOCKING_BAY_URL: 'docking-bay', VITE_PIXELDOJO_URL: 'pixelquest', VITE_DOJOTODAY_URL: 'dojotoday' }
for (const [env, app] of Object.entries(ENV_PINS)) {
  check(`os-env-pin-${env}`, osJs.includes(`${env}:\`/apps/${app}/\``), `${env} must resolve to /apps/${app}/ (the 127.0.0.1 strings in the bundle are canonical binding metadata, not resolved launch URLs — same as pin aa4d6c5)`)
}

// 4. embedded literacy app declares the wave contentVersion (single bump rode with T1/l24)
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-09-02.1', litJs.includes('2026-09-02.1'))
check('literacy-old-contentVersion-absent', !litJs.includes('2026-09-01.1'))

// 4b. embedded OS catalog carries the full wave catalog: 26 literacy (20 ai-pratica
// + 6 dev) + 7 game missions = 33 (map 30 -> 33); track header adds 1 ai-pratica hit.
{
  const literacyMissions = (osJs.match(/unitId:`ai-literacy:l/g) ?? []).length
  const literacyEvidence = (osJs.match(/schema:`literacy-evidence`/g) ?? []).length
  const gamesEvidence = (osJs.match(/schema:`teaching-game-evidence`/g) ?? []).length
  const aiPratica = (osJs.match(/trackId:`ai-pratica`/g) ?? []).length
  check('catalog-embeds-26-literacy-missions', literacyMissions === 26, String(literacyMissions))
  check('catalog-embeds-26-literacy-evidence', literacyEvidence === 26, String(literacyEvidence))
  check('catalog-embeds-7-game-missions', gamesEvidence === 7, String(gamesEvidence))
  check('catalog-embeds-33-total', literacyMissions + gamesEvidence === 33, `${literacyMissions}+${gamesEvidence}`)
  check('catalog-counts-ia-pratica-20', aiPratica === 21, `${aiPratica} hits = 20 missions + 1 track header`)
  check('wave-missions-present', ['l24', 'l25', 'l26'].every((id) => osJs.includes(`unitId:\`ai-literacy:${id}\``)))
  check('wave-chapterOrders-18-20', /chapterOrder:18/.test(osJs) && /chapterOrder:20/.test(osJs))
}

// 5. AID-271 reflow guards in published literacy CSS
const litCssPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.css/)?.[0]
const litCss = await (await fetch(`${BASE}/apps/literacydojo/${litCssPath}`)).text()
check('reflow-no-body-min-width-320', !/body\{[^}]*min-width:\s*320px/.test(litCss))
check('reflow-voxel-world-min-width-0', /\.voxel-world\{[^}]*min-width:\s*0/.test(litCss))

// 6. hosted MOTOR handshakes: literacy l01 + the three wave missions (ai-pratica track)
const browser = await chromium.launch()
const motor = async (label, path, origin) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub|mission/, { timeout: 20000 })
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    let status = ''
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(4000)
      status = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/MOTOR \w+/)?.[0] ?? '')
      if (status) break
    }
    const frameUrl = await page.evaluate(() => { const f = document.querySelector('iframe'); return f ? new URL(f.src).origin + new URL(f.src).pathname : 'none' })
    check(`MOTOR ${label}`, status === 'MOTOR running', `${status || 'no-status'} iframe=${frameUrl}`)
    check(`${label} iframe same-origin`, frameUrl.startsWith(new URL(BASE).origin + origin), frameUrl)
  } catch (e) {
    check(`MOTOR ${label}`, false, e.message.slice(0, 120))
  }
  await page.close()
}
await motor('l01', '/mission/ai-pratica/l01', '/apps/literacydojo/')
await motor('l24', '/mission/ai-pratica/l24', '/apps/literacydojo/')
await motor('l25', '/mission/ai-pratica/l25', '/apps/literacydojo/')
await motor('l26', '/mission/ai-pratica/l26', '/apps/literacydojo/')

// 7. chapter-map h1 counts the launchable public rail (stays 6; full catalog is 33 per 4b)
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub|mission/, { timeout: 20000 })
    await page.goto(BASE + '/map', { waitUntil: 'domcontentloaded' })
    let h1 = ''
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1500)
      h1 = await page.getByRole('heading', { name: /missões, uma sequência/ }).first().innerText().catch(() => '')
      if (h1) break
    }
    check('map-public-rail-stays-6', h1.includes('6 missões'), `public anonymous rail must stay 6 (#225 public offer preserved by the wave): ${h1.trim()}`)
  } catch (e) {
    check('map-public-rail-stays-6', false, e.message.slice(0, 120))
  }
  await page.close()
}
await browser.close()

// 8. verification bridge: 200 same-origin; 403 cross-origin; 401 unauthenticated POST
const session = {}
{
  const ok = await fetch(`${BASE}/__dojo/bridge/v1/session`, { headers: { 'Sec-Fetch-Site': 'same-origin' } })
  const body = await ok.json().catch(() => ({}))
  session.token = body.token
  check('bridge-session-200-same-origin', ok.status === 200 && typeof body.token === 'string' && body.token.length >= 43, `${ok.status} token=${(body.token || '').length}ch`)
  const forbidden = await fetch(`${BASE}/__dojo/bridge/v1/session`)
  const fb = await forbidden.json().catch(() => ({}))
  check('bridge-session-403-cross-origin', forbidden.status === 403 && fb.error === 'origin-forbidden', `${forbidden.status} ${JSON.stringify(fb).slice(0, 60)}`)
  const unauth = await fetch(`${BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin' } })
  check('bridge-verification-401-no-token', unauth.status === 401, String(unauth.status))
}

const postLiteracy = (record) => fetch(`${BASE}/__dojo/bridge/v1/verification`, {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ schemaId: 'literacy-evidence', schemaVersion: 1, record }),
})
const ts = () => new Date().toISOString()
const ATTEMPT = (id) => `precheck-c3310cb8-${id}-${Date.now()}`

// 8w. THE WAVE: every structured l24/l25/l26 activity dispatches through the staged
// bridge with an independent PASS receipt; producer never writes mastered.
const WAVE_RECORDS = {
  'l24-a1': {
    lessonId: 'l24', lessonVersion: 1, skillIds: ['pedir', 'avaliar'], activityId: 'l24-a1', activityType: 'choice',
    answer: { optionIds: ['opt-a', 'opt-b'] },
    deterministicChecks: { 'opt-a': true, 'opt-b': true, 'opt-c': true, 'opt-d': true, 'opt-e': true },
  },
  'l24-a3': {
    lessonId: 'l24', lessonVersion: 1, skillIds: ['pedir', 'avaliar'], activityId: 'l24-a3', activityType: 'missing_context',
    answer: { contextIds: ['tarefa-definida', 'area-do-quadro', 'formato-de-saida'] },
    deterministicChecks: { 'tarefa-definida': true, 'area-do-quadro': true, 'formato-de-saida': true, noExtraContext: 0 },
  },
  'l25-a1': {
    lessonId: 'l25', lessonVersion: 1, skillIds: ['proteger'], activityId: 'l25-a1', activityType: 'safety_classification',
    answer: { labels: { 'i-foto-produto': 'safe', 'i-quadro-clientes': 'sensitive', 'i-cracha': 'sensitive', 'i-ata-publica': 'safe', 'i-scan-cpf': 'sensitive', 'i-print-vagas': 'safe', 'i-foto-equipamento': 'safe' } },
    deterministicChecks: { 'i-foto-produto': true, 'i-quadro-clientes': true, 'i-cracha': true, 'i-ata-publica': true, 'i-scan-cpf': true, 'i-print-vagas': true, 'i-foto-equipamento': true },
  },
  'l25-a2': {
    lessonId: 'l25', lessonVersion: 1, skillIds: ['proteger'], activityId: 'l25-a2', activityType: 'choice',
    answer: { optionIds: ['opt-a'] },
    deterministicChecks: { 'opt-a': true, 'opt-b': true, 'opt-c': true },
  },
  'l25-a3': {
    lessonId: 'l25', lessonVersion: 1, skillIds: ['proteger'], activityId: 'l25-a3', activityType: 'missing_context',
    answer: { contextIds: ['checar-dados-pessoais-visiveis', 'tampar-antes-de-anexar'] },
    deterministicChecks: { 'checar-dados-pessoais-visiveis': true, 'tampar-antes-de-anexar': true, noExtraContext: 0 },
  },
  'l26-a1': {
    lessonId: 'l26', lessonVersion: 1, skillIds: ['avaliar', 'aplicar'], activityId: 'l26-a1', activityType: 'output_comparison',
    answer: { outputId: 'out-a', criterionIds: ['c-preserva-valores-exatos', 'c-sem-invencao'] },
    deterministicChecks: { betterOutputId: true, 'c-preserva-valores-exatos': true, 'c-sem-invencao': true, noExtraCriteria: 0 },
  },
  'l26-a2': {
    lessonId: 'l26', lessonVersion: 1, skillIds: ['avaliar', 'aplicar'], activityId: 'l26-a2', activityType: 'choice',
    answer: { optionIds: ['opt-valor', 'opt-data', 'opt-responsavel'] },
    deterministicChecks: { 'opt-valor': true, 'opt-data': true, 'opt-responsavel': true, 'opt-paginas': true, 'opt-tom': true },
  },
  'l26-a3': {
    lessonId: 'l26', lessonVersion: 1, skillIds: ['avaliar', 'aplicar'], activityId: 'l26-a3', activityType: 'sort',
    answer: { orderedIds: ['passo-proteger-anexo', 'passo-anexar-e-pedir', 'passo-comparar-campos', 'passo-corrigir-e-usar'] },
    deterministicChecks: { 'passo-proteger-anexo': true, 'passo-anexar-e-pedir': true, 'passo-comparar-campos': true, 'passo-corrigir-e-usar': true },
  },
}
for (const [id, base] of Object.entries(WAVE_RECORDS)) {
  const record = { ...base, schemaVersion: 1, source: 'literacydojo', attemptId: ATTEMPT(id), context: 'initial', pass: true, score: 1.0, timestamp: ts(), verifierRequired: true }
  const r = await postLiteracy(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? body ?? {}
  check(`wave-${id}-independent-PASS`, r.status === 200 && receipt.verdict === 'PASS' && receipt.independent_pass === true, `${r.status} ${JSON.stringify(body).slice(0, 120)}`)
  check(`wave-${id}-canonical-source`, receipt.source === 'independent-literacy-verifier', JSON.stringify(receipt.source))
  check(`wave-${id}-producer-never-mastered`, receipt.producer_writes_mastered === false && receipt.mastery_eligible === true, JSON.stringify({ pwm: receipt.producer_writes_mastered, me: receipt.mastery_eligible }))
}

// 8p. prompt_builder honesty probe: free text cannot be independently re-judged,
// so l24-a2 must fail closed (FAIL + explicit error) — never a fabricated PASS.
{
  const record = {
    schemaVersion: 1, source: 'literacydojo', attemptId: ATTEMPT('l24-a2-failclosed'), lessonId: 'l24', lessonVersion: 1,
    activityId: 'l24-a2', activityType: 'prompt_builder', skillIds: ['pedir', 'avaliar'],
    deterministicChecks: {}, pass: true, score: 1.0, timestamp: ts(), verifierRequired: true,
  }
  const r = await postLiteracy(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? body ?? {}
  const errText = JSON.stringify(receipt.errors ?? body)
  check('prompt-builder-fails-closed', r.status === 200 && receipt.verdict === 'FAIL' && errText.includes('independently'), `${r.status} ${errText.slice(0, 120)}`)
  check('prompt-builder-not-mastery-eligible', receipt.mastery_eligible === false && receipt.independent_pass === false, JSON.stringify({ me: receipt.mastery_eligible }))
}

// 8r. regression: teaching-game dispatch (wormhole/pipeline-plant echo attempt_id) still PASS
const PRODUCER_PAYLOADS = JSON.parse(await readFile('/tmp/opencode/promo601/learner/gate/tests/fixtures/teaching_game_producer_payloads.json', 'utf8'))
const post = (record) => fetch(`${BASE}/__dojo/bridge/v1/verification`, {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ schemaId: 'teaching-game-evidence', schemaVersion: 1, record }),
})
const makeRecord = (game, level, identity, attemptId) => {
  const payload = PRODUCER_PAYLOADS[game][level]
  return {
    source: 'voxeldojo', unit_id: identity.unit, project: identity.project,
    scenario_id: `${identity.slug}-${level}`, game, ts: ts(),
    ...(attemptId ? { attempt_id: attemptId } : {}), pass: true,
    metrics: payload.metrics, observations: payload.observations,
    review_context: { unit_kind: 'concept', scheduled_review: false, review_reason: 'deepening', scheduler_source: 'learner-substrate', verifier_required: true },
    curriculum_context: { concept: 'AID-601 wave precheck regression', mechanic: `${game} ${level}` },
  }
}
for (const [game, identity] of [
  ['WORMHOLE', { unit: 'U3-url-shortener', project: '03_url_shortener', slug: 'wormhole' }],
  ['PIPELINE PLANT', { unit: 'U6-file-upload', project: '06_file_upload_pipeline', slug: 'pipeline-plant' }],
]) {
  const attemptId = ATTEMPT(identity.slug)
  const r = await post(makeRecord(game, 'L1', identity, attemptId))
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? {}
  check(`bridge-accepts-${identity.slug}-L1-echo`, r.status === 200 && receipt.verdict === 'PASS' && receipt.attempt_id === attemptId, `${r.status} ${JSON.stringify(body).slice(0, 100)}`)
}

// 9. literacy verifier regression (AID-449 fix probes stay green)
const LITERACY = JSON.parse(await readFile('/tmp/opencode/promo601/learner/gate/tests/fixtures/literacy_producer_payloads.json', 'utf8'))
{
  const base = LITERACY.records.l01['l01-a1'].pass
  const record = { ...base, attemptId: ATTEMPT('l01'), timestamp: ts() }
  const r = await postLiteracy(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? body ?? {}
  check('fix-literacy-l01-pass-verdict', r.status === 200 && receipt.verdict === 'PASS', `${r.status} ${JSON.stringify(body).slice(0, 160)}`)
  check('fix-literacy-receipt-canonical-source', receipt.source === 'independent-literacy-verifier', JSON.stringify(receipt.source))
  const failBase = LITERACY.records.l01['l01-a1'].fail
  const forged = { ...failBase, pass: true, score: 1.0, attemptId: ATTEMPT('forge'), timestamp: ts() }
  const fr = await postLiteracy(forged)
  const fb2 = await fr.json().catch(() => ({}))
  const freceipt = fb2.receipt ?? fb2 ?? {}
  check('fix-literacy-forged-pass-fail-closed', fr.status === 200 && freceipt.verdict === 'FAIL', `${fr.status} ${JSON.stringify(fb2).slice(0, 140)}`)
}
{
  const r = await fetch(`${BASE}/__dojo/bridge/v1/verification`, {
    method: 'POST',
    headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ schemaId: 'not-a-real-schema', schemaVersion: 1, record: {} }),
  })
  const body = await r.json().catch(() => ({}))
  check('bridge-unknown-schema-still-422', r.status === 422 && JSON.stringify(body).includes('unsupported-schema'), `${r.status} ${JSON.stringify(body).slice(0, 80)}`)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) { console.log('FAILED:', failed.map((f) => f.id).join(', ')); process.exit(1) }
