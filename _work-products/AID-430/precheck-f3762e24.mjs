// AID-430 pre-check (adapted from _work-products/AID-410/precheck-72130c6d.mjs)
// Expected pin: f3762e2428ebfd8d8607683f7f44af4f516ac7f7 (PR #200 v15 evidence + PR #195 phase-race fix via 0f75daf + PR #194 bridge parity)
// Delta vs 72130c6d: staged bridge now verifies the full GAME_SPECS matrix (AID-415 fix) — sections 8b/8c probe it live.
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const require = createRequire('/paperclip/tmp/aid430/promo/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL
const PIN = 'f3762e2428ebfd8d8607683f7f44af4f516ac7f7'
const MANIFEST_SHA = '959d691f829ed1e0af3df4c4f5f933fea38702906a144c2336e1bfc5f7467de2'
const OS_SHA = 'b319126dd082e054d716c327deb6c4711fc83a89958be36a572e9cd3515c2379'
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

// 2. surfaces reachable (includes pipeline-plant)
for (const p of ['/', '/apps/literacydojo/', '/apps/warehouse/', '/apps/wormhole/', '/apps/relay-station/', '/apps/pipeline-plant/']) {
  const r = await fetch(BASE + p)
  check(`surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. OS bundle embeds same-origin pins, not stale/development fallbacks
const osJsPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
check('os-embeds-same-origin-literacy', osJs.includes('/apps/literacydojo/'))
check('os-embeds-same-origin-pipeline-plant', osJs.includes('/apps/pipeline-plant/'))
check('os-no-stale-external-pin', !osJs.includes('6a8ddc9afe6838bdcf19a465'))
check('os-copy-template-missions', osJs.includes('` missões, uma sequência`'))
check('os-pins-pixelDojo-immutable', osJs.includes('https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/'), 'VITE_PIXELDOJO_URL must be the immutable deploy, not a dev fallback')

// 4. embedded literacy app declares the expected contentVersion
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-08-21.1', litJs.includes('2026-08-21.1'))
check('literacy-not-2026-07-25.1', !litJs.includes('2026-07-25.1'))

// 5. AID-271 reflow guards in published literacy CSS
const litCssPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.css/)?.[0]
const litCss = await (await fetch(`${BASE}/apps/literacydojo/${litCssPath}`)).text()
check('reflow-no-body-min-width-320', !/body\{[^}]*min-width:\s*320px/.test(litCss))
check('reflow-voxel-world-min-width-0', /\.voxel-world\{[^}]*min-width:\s*0/.test(litCss))

// 6. live MOTOR handshake: controls + C4/C5 batch endpoints
const browser = await chromium.launch()
for (const [label, path] of [['l01', '/mission/ai-pratica/l01'], ['l14', '/mission/ai-pratica/l14'], ['l15', '/mission/dev/l15'], ['game-06', '/mission/dev/game-06-pipeline-plant'], ['warehouse', '/mission/dev/game-02-warehouse']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const ready = []
  page.on('console', (m) => { const t = m.text(); if (t.includes('engine.ready')) ready.push(t.slice(0, 200)) })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    let status = ''
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(4000)
      status = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/MOTOR \w+/)?.[0] ?? '')
      if (status) break
    }
    const frameUrl = await page.evaluate(() => { const f = document.querySelector('iframe'); return f ? new URL(f.src).origin + new URL(f.src).pathname : 'none' })
    check(`MOTOR ${label}`, status === 'MOTOR running', `${status || 'no-status'} iframe=${frameUrl}`)
    if (label.startsWith('l')) check(`${label} iframe same-origin`, frameUrl.startsWith(new URL(BASE).origin + '/apps/literacydojo/'), frameUrl)
    if (label === 'game-06') check('game-06 iframe same-origin', frameUrl.startsWith(new URL(BASE).origin + '/apps/pipeline-plant/'), frameUrl)
    if (label === 'warehouse') check('warehouse iframe same-origin', frameUrl.startsWith(new URL(BASE).origin + '/apps/warehouse/'), frameUrl)
  } catch (e) {
    check(`MOTOR ${label}`, false, e.message.slice(0, 120))
  }
  await page.close()
}

// 7. reflow predicate inside the embedded iframe at 320px AND ~298px (AID-271)
for (const vw of [320, 298]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 640 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
    await page.goto(BASE + '/mission/ai-pratica/l01', { waitUntil: 'domcontentloaded' })
    const handle = await page.waitForSelector('iframe[src*="literacydojo"]', { timeout: 20000 })
    const frame = await handle.contentFrame()
    let pred
    for (let i = 0; i < 15; i++) {
      pred = await frame.evaluate(() => {
        const d = document.scrollingElement ?? document.documentElement
        return { docScrollW: d.scrollWidth, innerW: window.innerWidth, ok: d.scrollWidth <= window.innerWidth }
      })
      if (pred.docScrollW > 0) break
      await page.waitForTimeout(1000)
    }
    check(`reflow-iframe@${vw}`, pred.ok, `docScrollW=${pred.docScrollW} innerW=${pred.innerW}`)
  } catch (e) {
    check(`reflow-iframe@${vw}`, false, e.message.slice(0, 120))
  }
  await page.close()
}

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

// 8b/8c. AID-430 delta: staged bridge must ACCEPT official hosted evidence for the games the
// old pin rejected (AID-415 defect: wormhole/pipeline-plant/relay got FAIL "evidence identity
// is not the fixed WAREHOUSE L1 verifier contract"). Official fixtures: learner/gate tests.
const PRODUCER_PAYLOADS = JSON.parse(await readFile('/paperclip/tmp/aid430/promo/learner/gate/tests/fixtures/teaching_game_producer_payloads.json', 'utf8'))
const IDENTITIES = {
  WORMHOLE: { unit_id: 'U3-url-shortener', project: '03_url_shortener', scenario: 'wormhole' },
  'PIPELINE PLANT': { unit_id: 'U6-file-upload', project: '06_file_upload_pipeline', scenario: 'pipeline-plant' },
}
for (const game of ['WORMHOLE', 'PIPELINE PLANT']) {
  try {
    const payload = PRODUCER_PAYLOADS[game]['L1']
    const identity = IDENTITIES[game]
    const record = {
      source: 'voxeldojo',
      unit_id: identity.unit_id,
      project: identity.project,
      scenario_id: `${identity.scenario}-L1`,
      game,
      ts: new Date().toISOString(),
      attempt_id: `precheck-${identity.scenario}-L1-${Date.now()}`,
      pass: true,
      metrics: payload.metrics,
      observations: payload.observations,
      review_context: {
        unit_kind: 'concept',
        scheduled_review: false,
        review_reason: 'deepening',
        scheduler_source: 'learner-substrate',
        verifier_required: true,
      },
      curriculum_context: { concept: 'precheck parity probe', mechanic: `${identity.scenario} L1` },
    }
    const r = await fetch(`${BASE}/__dojo/bridge/v1/verification`, {
      method: 'POST',
      headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ schemaId: 'teaching-game-evidence', schemaVersion: 1, record }),
    })
    const body = await r.json().catch(() => ({}))
    const receipt = body.receipt ?? {}
    check(`bridge-accepts-${identity.scenario}-L1`, r.status === 200 && receipt.verdict === 'PASS' && receipt.game === game && receipt.attempt_id === record.attempt_id, `${r.status} ${JSON.stringify(body).slice(0, 120)}`)
  } catch (e) {
    check(`bridge-accepts-${IDENTITIES[game].scenario}-L1`, false, e.message.slice(0, 120))
  }
}

// 9. chapter-map h1 counts the launchable catalog at runtime (14 IA Prática + 7 Dev = 21)
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
    await page.getByRole('button', { name: 'Abrir mapa' }).click()
    const h1 = await page.getByRole('heading', { name: /missões, uma sequência/ }).first().innerText()
    check('map-count-21-missions', h1.includes('21 missões'), h1.trim())
  } catch (e) {
    check('map-count-21-missions', false, e.message.slice(0, 120))
  }
  await page.close()
}

// 10. published catalog embedded in the OS bundle: 21 chapterOrder entries incl. C4/C5 missions
{
  check('catalog-embeds-game-06', osJs.includes('game-06-pipeline-plant'))
  check('catalog-embeds-l15-l17', osJs.includes('l15') && osJs.includes('l16') && osJs.includes('l17'))
  const orders = osJs.match(/chapterOrder:(\d+)/g) ?? []
  check('catalog-21-chapterOrders', orders.length === 21, String(orders.length))
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) { console.log('FAILED:', failed.map((f) => f.id).join(', ')); process.exit(1) }
