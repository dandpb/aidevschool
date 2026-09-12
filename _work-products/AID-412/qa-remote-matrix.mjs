// AID-412 QA Lead — matriz de regressão remota independente (padrão AID-278/284)
// Uso: QA_BASE_URL=<alias|permalink> node qa-remote-matrix.mjs <tag> <outdir>
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'

const require = createRequire('/paperclip/tmp/aid410/promo/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL
const TAG = process.argv[2] ?? 'base'
const OUT = process.argv[3] ?? `/paperclip/tmp/aid412-qa/out-${TAG}`
mkdirSync(OUT, { recursive: true })

const PIN = '72130c6d7002fc03d2fccb6a1131d05f7bbab467'
const MANIFEST_SHA = 'f81bfd077214d1ec903a376850c486d2490fa0e65289149df7a1e79d3d798d04'
const results = []
const notes = {}
const check = (id, ok, detail = '') => {
  results.push({ id, ok, detail: String(detail).slice(0, 300) })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} :: ${String(detail).slice(0, 160)}`)
}
const sha = (s) => createHash('sha256').update(s).digest('hex')
const snap = async (page, name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }) }

// ---------- 1. Identidade estática ----------
const mres = await fetch(`${BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('A1 manifest-sha256', mres.ok && sha(mbody) === MANIFEST_SHA, sha(mbody))
check('A2 manifest-sourceRevision', manifest.sourceRevision === PIN, manifest.sourceRevision)

for (const [name, surface] of Object.entries(manifest.surfaces)) {
  const entry = await (await fetch(`${BASE}/${surface.entry}`)).text()
  check(`A3 entry-sha ${name}`, sha(entry) === surface.sha256, `${sha(entry).slice(0, 12)} vs ${surface.sha256.slice(0, 12)}`)
  if (surface.requiredFiles) {
    for (const [p, meta] of Object.entries(surface.requiredFiles)) {
      const body = await (await fetch(`${BASE}/${p}`)).text()
      check(`A4 requiredFile ${p}`, sha(body) === meta.sha256, sha(body).slice(0, 12))
    }
  }
}

let files200 = 0
const fileEntries = Object.entries(manifest.files ?? {})
for (const [p] of fileEntries) {
  const r = await fetch(`${BASE}/${p}`)
  if (r.status === 200) files200++
}
check('A5 files-inventory-200', fileEntries.length > 0 && files200 === fileEntries.length, `${files200}/${fileEntries.length}`)

const osHtml = await (await fetch(`${BASE}/`)).text()
const osJsPath = osHtml.match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
notes['os-asset'] = osJsPath
notes['os-asset-has-pin'] = osJs.includes('https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/')
check('A6 os-embeds-same-origin-literacy', osJs.includes('/apps/literacydojo/'))
check('A7 os-embeds-same-origin-pipeline-plant', osJs.includes('/apps/pipeline-plant/'))
check('A8 os-no-stale-external-pin', !osJs.includes('6a8ddc9afe6838bdcf19a465'))
check('A9 os-pins-pixelDojo-immutable', osJs.includes('https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/'))
const orders = osJs.match(/chapterOrder:\s*(\d+)/g) ?? []
check('A10 catalog-21-chapterOrders', orders.length === 21, orders.length)
check('A11 catalog-embeds-new-missions', osJs.includes('game-06-pipeline-plant') && osJs.includes('l15') && osJs.includes('l16') && osJs.includes('l17'))
const prereqCtx = osJs.match(/id:"l16".{0,200}?prerequisites:\[[^\]]*\]/s)?.[0] ?? osJs.match(/l16[^\n]{0,400}/)?.[0] ?? ''
notes['l16-bundle-excerpt'] = prereqCtx.slice(0, 300)

const litHtml = await (await fetch(`${BASE}/apps/literacydojo/`)).text()
const litJsPath = litHtml.match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('A12 literacy-contentVersion', litJs.includes('2026-08-21.1') && !litJs.includes('2026-07-25.1'), '2026-08-21.1')

for (const p of ['/apps/literacydojo/', '/apps/warehouse/', '/apps/wormhole/', '/apps/relay-station/', '/apps/pipeline-plant/']) {
  const r = await fetch(BASE + p)
  check(`A13 surface-200 ${p}`, r.status === 200, r.status)
}

// ---------- 2. Ponte de verificação ----------
const session = await fetch(`${BASE}/__dojo/bridge/v1/session`, { headers: { 'Sec-Fetch-Site': 'same-origin' } })
const sessionBody = await session.json().catch(() => ({}))
check('B1 bridge-session-200', session.status === 200 && typeof sessionBody.token === 'string' && sessionBody.token.length >= 43, `${session.status} token=${(sessionBody.token || '').length}ch`)
const forbidden = await fetch(`${BASE}/__dojo/bridge/v1/session`)
const fb = await forbidden.json().catch(() => ({}))
check('B2 bridge-403-cross-origin', forbidden.status === 403 && fb.error === 'origin-forbidden', `${forbidden.status} ${JSON.stringify(fb).slice(0, 50)}`)
const unauth = await fetch(`${BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin', 'content-type': 'application/json' }, body: '{}' })
check('B3 bridge-401-no-token', unauth.status === 401, unauth.status)

const postVerify = async (record) => {
  const r = await fetch(`${BASE}/__dojo/bridge/v1/verification`, {
    method: 'POST',
    headers: { 'Sec-Fetch-Site': 'same-origin', 'content-type': 'application/json', 'x-codexdojo-bridge-token': sessionBody.token },
    body: JSON.stringify({ schemaId: 'teaching-game-evidence', schemaVersion: 1, record }),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
// WAREHOUSE válido (trilha fechada correta — contrato fixo da ponte)
const EXPECTED_KEYS = [['key:8gl33c:0', 2], ['key:8ril9k:1', 4], ['key:a223ac:2', 2], ['key:9rd4jn:3', 3], ['key:e2j3i0:4', 2], ['key:8wbont:5', 5], ['key:1bn8kx:6', 0], ['key:8ruko7:7', 5], ['key:a1twjr:8', 5], ['key:7g40wq:9', 3], ['key:7xsz51:10', 1], ['key:dy7kps:11', 2]]
const warehouseRecord = {
  source: 'voxeldojo', unit_id: 'U2-key-value-store', project: '02_key_value_store', game: 'KV WAREHOUSE',
  scenario_id: 'kv-warehouse-L1', attempt_id: 'qa-aid412-warehouse', ts: new Date().toISOString(), pass: true,
  observations: { kind: 'warehouse-L1', predictions: EXPECTED_KEYS.map(([key, shelf]) => ({ key, shelf })) },
  metrics: { kind: 'voxeldoj-kv-warehouse', shelf_predictions: 12, shelf_prediction_accuracy: 1 },
  review_context: { verifier_required: true },
}
const wh = await postVerify(warehouseRecord)
check('B4 bridge-warehouse-PASS', wh.status === 200 && wh.body?.receipt?.verdict === 'PASS', `${wh.status} ${wh.body?.receipt?.verdict} errors=${JSON.stringify(wh.body?.receipt?.errors ?? []).slice(0, 80)}`)

// PIPELINE PLANT (registro canônico do produtor, routerVerificationRecords.ts) — comportamento real da ponte
const pipelineRecord = {
  source: 'voxeldojo', unit_id: 'U6-file-upload', project: '06_file_upload_pipeline', game: 'PIPELINE PLANT',
  scenario_id: 'pipeline-plant-L4', attempt_id: 'qa-aid412-pipeline', ts: new Date().toISOString(), pass: true,
  observations: { kind: 'pipeline-plant-L4', predictedOverflow: true },
  metrics: { kind: 'voxeldoj-pipeline-plant', size: 1308, capacity: 100, mode: 'buffered', overflow_predicted: true, overflow_actual: true, peak_mem: 1308, delivered: 200, overflowed: 1108, stalled: false, drained: 100, drain_rate: 0.1, time_ms: 1000 },
  review_context: { verifier_required: true },
}
const pl = await postVerify(pipelineRecord)
notes['bridge-pipeline-response'] = JSON.stringify(pl).slice(0, 600)
const plVerdict = pl.body?.receipt?.verdict ?? `http-${pl.status}`
const plIdentityError = (pl.body?.receipt?.errors ?? []).some((e) => String(e).includes('WAREHOUSE L1'))
check('B5 bridge-pipeline-verdict-captured', pl.status === 200 && typeof pl.body?.receipt?.verdict === 'string', `verdict=${plVerdict} (escopo da ponte: warehouse-only=${plIdentityError})`)

// ---------- 3. Jornadas ao vivo ----------
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const motorStatus = async (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/MOTOR \w+/)?.[0] ?? '')
const frameOrigin = async (p) => p.evaluate(() => { const f = document.querySelector('iframe'); if (!f) return 'none'; const u = new URL(f.src); return u.origin + u.pathname })
const enter = async (p) => {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await p.getByRole('button', { name: 'Entrar na escola' }).click()
  await p.waitForURL(/hub/, { timeout: 20000 })
}
const openMission = async (p, path) => {
  await p.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 10; i++) {
    await p.waitForTimeout(3500)
    const t = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
    if (/MOTOR \w+/.test(t) || /pré-?requisito|Bloqueada/i.test(t)) return t
  }
  return p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
}

// C1 mapa: 21 missões
await enter(page)
await page.getByRole('button', { name: 'Abrir mapa' }).click()
const h1 = await page.getByRole('heading', { name: /missões, uma sequência/ }).first().innerText()
check('C1 map-count-21', h1.includes('21 missões'), h1.trim())
await snap(page, 'map-21')
await page.goBack()

// C2 MOTOR controles: l01, l14
for (const [label, path] of [['l01', '/mission/ai-pratica/l01'], ['l14', '/mission/ai-pratica/l14']]) {
  const text = await openMission(page, path)
  const status = text.match(/MOTOR \w+/)?.[0] ?? 'no-status'
  const fo = await frameOrigin(page)
  check(`C2 MOTOR-control-${label}`, status === 'MOTOR running', `${status} iframe=${fo}`)
  check(`C2b ${label}-iframe-same-origin`, fo.startsWith(new URL(BASE).origin + '/apps/literacydojo/'), fo)
}

// C3 l15 nova: MOTOR + handshake
{
  const text = await openMission(page, '/mission/dev/l15')
  const status = text.match(/MOTOR \w+/)?.[0] ?? 'no-status'
  const fo = await frameOrigin(page)
  check('C3 MOTOR-l15', status === 'MOTOR running', `${status} iframe=${fo}`)
  check('C3b l15-iframe-same-origin', fo.startsWith(new URL(BASE).origin + '/apps/literacydojo/'), fo)
  await snap(page, 'l15-running')
}

// C4 gating canônico no mapa: tiles l16/l17/game-06 bloqueadas com pré-requisito canônico
const tileState = async (p, title) => {
  const li = p.locator('li.mission-map-node').filter({ hasText: title }).first()
  const cls = (await li.getAttribute('class')) ?? ''
  const label = await li.locator('small').innerText().catch(() => '')
  const prereq = await li.locator('span').filter({ hasText: /Pré-requisito/ }).innerText().catch(() => '')
  return { locked: cls.includes('locked'), label, prereq }
}
const gotoMap = async (p) => { await p.goto(BASE + '/map', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500) }
{
  await gotoMap(page)
  const t16 = await tileState(page, 'Primeiro código com um assistente')
  check('C4 map-l16-locked-needs-l15', t16.locked && t16.label.includes('Bloqueada') && t16.prereq.includes('l15'), JSON.stringify(t16))
  const t17 = await tileState(page, 'Integre uma API de IA')
  check('C4b map-l17-locked-needs-l16', t17.locked && t17.prereq.includes('l16'), JSON.stringify(t17))
  const t06 = await tileState(page, 'PIPELINE PLANT')
  check('C4c map-game-06-locked-needs-game-05', t06.locked && t06.prereq.includes('game-05-relay-station'), JSON.stringify(t06))
  await snap(page, 'map-locked-tiles')
  // observacional: deep-link em missão bloqueada (MissionShell não trava deep-link)
  const t16d = await openMission(page, '/mission/dev/l16')
  notes['l16-deeplink'] = t16d.slice(0, 300)
  await snap(page, 'l16-deeplink')
}

// C5 cadeia ao vivo: completar l15 pela UI → l16 destrava; l17 segue bloqueada
{
  await page.goto(BASE + '/mission/dev/l15', { waitUntil: 'domcontentloaded' })
  const mission = page.frameLocator('.mission-runtime iframe')
  await mission.getByTestId('start-lesson').click({ timeout: 20000 })
  await mission.getByTestId('option-opt-b').check()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('next-activity').click()
  await mission.getByTestId('output-out-a').check()
  await mission.getByTestId('criterion-c-concreto').check()
  await mission.getByTestId('criterion-c-cenario').check()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('finish-lesson').click()
  await page.getByRole('button', { name: 'Voltar ao hub', exact: true }).click({ timeout: 30000 })
  const progress = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const req = db.transaction('progress').objectStore('progress').get('os-progress')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => { db.close(); resolve(req.result) }
    }
  }))
  check('C5 l15-completed-local', progress?.missionStatusByKey?.['dev:l15'] === 'completed', progress?.missionStatusByKey?.['dev:l15'])
  await snap(page, 'l15-completed-hub')

  await gotoMap(page)
  const tm16 = await tileState(page, 'Primeiro código com um assistente')
  check('C5b map-l16-unlocked-after-l15', !tm16.locked && !tm16.label.includes('Bloqueada'), JSON.stringify(tm16))
  const tm17 = await tileState(page, 'Integre uma API de IA')
  check('C5c map-l17-still-locked', tm17.locked && tm17.prereq.includes('l16'), JSON.stringify(tm17))
  await snap(page, 'map-after-l15')
  const t16 = await openMission(page, '/mission/dev/l16')
  check('C5d l16-runs-after-l15', t16.match(/MOTOR running/) !== null, `${t16.match(/MOTOR \w+/)?.[0] ?? 'no-status'}`)
  await snap(page, 'l16-unlocked')
}

// C6 game-06: MOTOR + iframe same-origin + conclusão determinística + veredito honesto
{
  const t = await openMission(page, '/mission/dev/game-06-pipeline-plant')
  const status = t.match(/MOTOR \w+/)?.[0] ?? 'no-status'
  const fo = await frameOrigin(page)
  check('C6 MOTOR-game-06', status === 'MOTOR running', `${status} iframe=${fo}`)
  check('C6b game-06-iframe-same-origin', fo.startsWith(new URL(BASE).origin + '/apps/pipeline-plant/'), fo)
  await snap(page, 'game-06-running')

  const handle = await page.waitForSelector('iframe[src*="pipeline-plant"]', { timeout: 30000 })
  let phase = null
  for (let i = 0; i < 15 && phase === null; i++) {
    phase = await (await handle.contentFrame()).evaluate(() => window.__pipelinePlant?.game?.snapshot?.phase ?? null).catch(() => null)
    if (phase === null) await page.waitForTimeout(2000)
  }
  check('C6c game-06-hook-present', phase !== null, `phase=${phase}`)
  if (phase !== null) {
    const fr = await handle.contentFrame()
    await fr.evaluate(() => {
      const hook = window.__pipelinePlant
      if (hook.game.snapshot.phase === 'briefing') hook.game.start()
      hook.game.predictOverflow(hook.game.bufferedOverflows())
    })
  }
  // capturar veredito na própria página da missão antes de voltar ao hub
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(2000)
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
    if (/Veredito independente|Verificação independente aprovada|Verificador indisponível|Evidência rejeitada|Verificação pede/i.test(body)) {
      notes['game-06-post-completion'] = body.slice(0, 900)
      await snap(page, 'game-06-verdict')
      break
    }
    if (i === 9) notes['game-06-post-completion'] = body.slice(0, 900)
  }
  await page.getByRole('button', { name: 'Voltar ao hub', exact: true }).click({ timeout: 30000 })
  const verdictText = notes['game-06-post-completion'] ?? ''
  const progress = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const req = db.transaction('progress').objectStore('progress').get('os-progress')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => { db.close(); resolve(req.result) }
    }
  }))
  check('C6e game-06-completed-local', progress?.missionStatusByKey?.['dev:game-06-pipeline-plant'] === 'completed', progress?.missionStatusByKey?.['dev:game-06-pipeline-plant'])
  const approved = /Verificação independente aprovada|veredito independente: PASS/i.test(verdictText)
  const failHonest = /veredito independente: FAIL|Verificador indisponível|Evidência rejeitada|Verificação pede nova tentativa/i.test(verdictText)
  check('C6d game-06-verdict-reported-honestly', approved || failHonest, approved ? 'PASS' : (failHonest ? 'FAIL reportado honestamente (ver nota bridge-pipeline-response)' : `sem relato de veredito :: ${verdictText.slice(0, 120)}`))
  await page.goto(BASE + '/hub', { waitUntil: 'domcontentloaded' })
}

// C7 fallback DOM quando o motor hospedado não carrega (game-06): rodapé de fallback + página íntegra
{
  const fbCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const fbPage = await fbCtx.newPage()
  await fbPage.route('**/apps/pipeline-plant/**', (route) => route.abort())
  await enter(fbPage)
  await fbPage.goto(BASE + '/mission/dev/game-06-pipeline-plant', { waitUntil: 'domcontentloaded' })
  await fbPage.waitForTimeout(6000)
  const txt = await fbPage.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
  const fallback = /Preveja transbordo do tanque/i.test(txt) && /PIPELINE PLANT/i.test(txt)
  check('C7 game-06-dom-fallback', fallback, txt.slice(0, 160))
  await snap(fbPage, 'game-06-dom-fallback')
  notes['game-06-fallback-text'] = txt.slice(0, 600)
  await fbCtx.close()
}

// C8 warehouse controle MOTOR (iframe same-origin)
{
  const t = await openMission(page, '/mission/dev/game-02-warehouse')
  const status = t.match(/MOTOR \w+/)?.[0] ?? 'no-status'
  const fo = await frameOrigin(page)
  check('C8 MOTOR-warehouse-control', status === 'MOTOR running', `${status} iframe=${fo}`)
  check('C8b warehouse-iframe-same-origin', fo.startsWith(new URL(BASE).origin + '/apps/warehouse/'), fo)
}

await ctx.close()
await browser.close()

const failed = results.filter((r) => !r.ok)
writeFileSync(`${OUT}/results-${TAG}.json`, JSON.stringify({ base: BASE, tag: TAG, at: new Date().toISOString(), results, notes }, null, 2))
console.log(`\n=== ${TAG}: ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) { console.log('FAILED:', failed.map((f) => f.id).join(', ')); process.exit(1) }
