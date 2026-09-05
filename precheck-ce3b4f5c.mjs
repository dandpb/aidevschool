// AID-462 OP-A wave promotion pre-check (adapted from AID-456 precheck-2ec910a.mjs)
// Expected pin: ce3b4f5c (PR #210 merge — game-07/08/09 bindings, map 24→27)
// Delta vs 2ec910a: three new hosted voxel missions (CHECKPOINT CITY, TIMELINE TOWER,
// DOCKING BAY), same-origin app pins for them, map = 27, bridge dispatches the three
// new games, plus the D1 fix-forward (game-09 dock truth = clamp checkContract).
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const require = createRequire('/tmp/opencode/promo462/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL.replace(/\/$/, "")
const PIN = 'ce3b4f5c9c4d3bbcab13622f471a29fc6d97efab'
const MANIFEST_SHA = '50f897d246b5ff6e63944a231a56e4362e3d473caf32db00d080da002dc12374'
const OS_SHA = '35ed51e3dfc8d9599b5317644937376b92b10e5e88ab541da3eadf0242a6421d'
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

// 2. surfaces reachable (8 bundled apps)
for (const p of ['/', '/apps/literacydojo/', '/apps/warehouse/', '/apps/wormhole/', '/apps/relay-station/', '/apps/pipeline-plant/', '/apps/checkpoint-city/', '/apps/timeline-tower/', '/apps/docking-bay/']) {
  const r = await fetch(BASE + p)
  check(`surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. OS bundle embeds same-origin pins, not stale/development fallbacks
const osJsPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
check('os-embeds-same-origin-literacy', osJs.includes('/apps/literacydojo/'))
check('os-embeds-same-origin-pipeline-plant', osJs.includes('/apps/pipeline-plant/'))
check('os-embeds-same-origin-checkpoint-city', osJs.includes('/apps/checkpoint-city/'))
check('os-embeds-same-origin-timeline-tower', osJs.includes('/apps/timeline-tower/'))
check('os-embeds-same-origin-docking-bay', osJs.includes('/apps/docking-bay/'))
check('os-pins-pixelDojo-immutable', osJs.includes('https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/'), 'VITE_PIXELDOJO_URL must be the immutable deploy, not a dev fallback')

// 4. embedded literacy app declares the expected contentVersion (unchanged by the wave)
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-08-31.1', litJs.includes('2026-08-31.1'))

// 5. AID-271 reflow guards in published literacy CSS
const litCssPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.css/)?.[0]
const litCss = await (await fetch(`${BASE}/apps/literacydojo/${litCssPath}`)).text()
check('reflow-no-body-min-width-320', !/body\{[^}]*min-width:\s*320px/.test(litCss))
check('reflow-voxel-world-min-width-0', /\.voxel-world\{[^}]*min-width:\s*0/.test(litCss))

// 6. hosted MOTOR handshakes: literacy l01 + the three wave missions
const browser = await chromium.launch()
const motor = async (label, path, origin) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
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
await motor('game-07', '/mission/dev/game-07-checkpoint-city', '/apps/checkpoint-city/')
await motor('game-08', '/mission/dev/game-08-timeline-tower', '/apps/timeline-tower/')
await motor('game-09', '/mission/dev/game-09-docking-bay', '/apps/docking-bay/')

// 7. chapter-map h1 counts the launchable catalog (wave: 27)
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
    await page.getByRole('button', { name: 'Abrir mapa' }).click()
    const h1 = await page.getByRole('heading', { name: /missões, uma sequência/ }).first().innerText()
    check('map-count-27-missions', h1.includes('27 missões'), h1.trim())
  } catch (e) {
    check('map-count-27-missions', false, e.message.slice(0, 120))
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

const PRODUCER_PAYLOADS = JSON.parse(await readFile('/tmp/opencode/promo462/learner/gate/tests/fixtures/teaching_game_producer_payloads.json', 'utf8'))
const post = (record) => fetch(`${BASE}/__dojo/bridge/v1/verification`, {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ schemaId: 'teaching-game-evidence', schemaVersion: 1, record }),
})
const makeRecord = (game, level, identity, attemptId) => {
  const payload = PRODUCER_PAYLOADS[game][level]
  return {
    source: 'voxeldojo', unit_id: identity.unit, project: identity.project,
    scenario_id: `${identity.slug}-${level}`, game, ts: new Date().toISOString(),
    ...(attemptId ? { attempt_id: attemptId } : {}), pass: true,
    metrics: payload.metrics, observations: payload.observations,
    review_context: { unit_kind: 'concept', scheduled_review: false, review_reason: 'deepening', scheduler_source: 'learner-substrate', verifier_required: true },
    curriculum_context: { concept: 'OP-A wave precheck', mechanic: `${game} ${level}` },
  }
}

// 8b/8c/8e. unchanged behavior: dispatched games echo attempt_id receipts
for (const [game, identity] of [
  ['WORMHOLE', { unit: 'U3-url-shortener', project: '03_url_shortener', slug: 'wormhole' }],
  ['PIPELINE PLANT', { unit: 'U6-file-upload', project: '06_file_upload_pipeline', slug: 'pipeline-plant' }],
]) {
  const attemptId = `precheck-ce3b4f5c-${identity.slug}-${Date.now()}`
  const r = await post(makeRecord(game, 'L1', identity, attemptId))
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? {}
  check(`bridge-accepts-${identity.slug}-L1-echo`, r.status === 200 && receipt.verdict === 'PASS' && receipt.attempt_id === attemptId, `${r.status} ${JSON.stringify(body).slice(0, 100)}`)
}

// 8w. THE WAVE: the three new games must dispatch through the staged bridge with independent PASS receipts
for (const [game, identity] of [
  ['CHECKPOINT CITY', { unit: 'U7-rest-api-auth', project: '07_rest_api_auth', slug: 'checkpoint-city' }],
  ['TIMELINE TOWER', { unit: 'U8-event-driven', project: '08_event_driven_order_system', slug: 'timeline-tower' }],
  ['DOCKING BAY', { unit: 'U9-plugin-system', project: '09_plugin_system', slug: 'docking-bay' }],
]) {
  const attemptId = `precheck-ce3b4f5c-${identity.slug}-${Date.now()}`
  const r = await post(makeRecord(game, 'L1', identity, attemptId))
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? {}
  check(`bridge-accepts-${identity.slug}-L1`, r.status === 200 && receipt.verdict === 'PASS' && receipt.attempt_id === attemptId, `${r.status} ${JSON.stringify(body).slice(0, 100)}`)
  check(`bridge-${identity.slug}-independent-source`, receipt.source === 'independent-teaching-game-verifier' && receipt.producer_pass_claim === true, JSON.stringify(receipt.source))
}
// 8f. D1 fix-forward probe: a forged all-dock L1 observation for DOCKING BAY must FAIL
// (the recomputed truth rejects mismatched pods — the old constant-true oracle would pass it)
{
  const record = makeRecord('DOCKING BAY', 'L1', { unit: 'U9-plugin-system', project: '09_plugin_system', slug: 'docking-bay' }, `precheck-ce3b4f5c-d1forge-${Date.now()}`)
  record.observations = { kind: 'docking-bay-L1', dockPredictions: [0,1,2,3,4,5].map((i) => ({ podId: `pod-${i}`, predictedDock: true })) }
  record.metrics = { kind: 'voxeldoj-docking-bay', dock_predictions: 6, dock_prediction_accuracy: 0.33, contracts_checked: 6 }
  const r = await post(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? {}
  check('docking-bay-forged-all-dock-fails', r.status === 200 && receipt.verdict === 'FAIL', `${r.status} ${JSON.stringify(body).slice(0, 140)}`)
}

// 9. literacy verifier regression (AID-449 fix probes stay green)
const LITERACY = JSON.parse(await readFile('/tmp/opencode/promo462/learner/gate/tests/fixtures/literacy_producer_payloads.json', 'utf8'))
const postLiteracy = (record) => fetch(`${BASE}/__dojo/bridge/v1/verification`, {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ schemaId: 'literacy-evidence', schemaVersion: 1, record }),
})
{
  const base = LITERACY.records.l01['l01-a1'].pass
  const record = { ...base, attemptId: `precheck-ce3b4f5c-l01-${Date.now()}`, timestamp: new Date().toISOString() }
  const r = await postLiteracy(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? body ?? {}
  check('fix-literacy-l01-pass-verdict', r.status === 200 && receipt.verdict === 'PASS', `${r.status} ${JSON.stringify(body).slice(0, 160)}`)
  check('fix-literacy-receipt-canonical-source', receipt.source === 'independent-literacy-verifier', JSON.stringify(receipt.source))
  const failBase = LITERACY.records.l01['l01-a1'].fail
  const forged = { ...failBase, pass: true, score: 1.0, attemptId: `precheck-ce3b4f5c-forge-${Date.now()}`, timestamp: new Date().toISOString() }
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
