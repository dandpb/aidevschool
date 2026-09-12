// AID-1288 O3-C2 lesson-bump promotion pre-check — retrofit l08–l13 (3
// atividades) single-PR landing (PR #330; merge pin cb128865; ruling AID-640;
// wave tree AID-1279 / landing AID-1220 B3; promotion AID-1288).
// Adapted from _work-products/AID-1251/precheck-e91272b2.mjs (canonical
// ancestor _work-products/AID-935/precheck-65d64bca.mjs per
// docs/serving/PROMOTION-RUNBOOK.md §4.2).
// O3-C2 anchors: contentVersion 2026-09-10.2 uniform x35 (zero stale
// 2026-09-10.1); mission counts unchanged (32 literacy + 7 games = 39);
// l08–l13 wave probe on the regenerated corpus (3 activities per lesson).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const OS_BASE = process.env.OS_BASE_URL.replace(/\/$/, '')
const LIT_BASE = process.env.LIT_BASE_URL.replace(/\/$/, '')
const PIN = 'cb12886572a5384d7263956291c4f7bfb2f84c21'
const MANIFEST_SHA = '5d1b35e615f1894b93bd23ee504e72f8fcda7f9b1de0240dfbd1d705f195898f'
const OS_SHA = 'cad0de2b6bc1437573ac14b6716c58624eb9ce8a004078a115050f6a5067771f'
const LIT_SHA = '6bb26ca47a34530db7587e748682e537baf2c377a7fa6953e471d0a2e1ac2c0c'
const WT = '/tmp/opencode/aid1241-wt'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')
const j = async (url, opts) => { const r = await fetch(url, opts); const t = await r.text(); let b = null; try { b = JSON.parse(t) } catch {}; return { r, t, b } }

// canonical counts derived at the pin from the generated missions projection
// (src/data/missions.ts @ cb128865; regenerated + CI-verified on the merge):
// O3-C2 is a retrofit (3 atividades) — no new missions/bindings/tracks:
// 32 unitId ai-literacy:lNN (l01..l32), 7 games, verifierRequired 39,
// kind dom 39, trackId ai-pratica 24 / dev 17 (same as the W1 wave),
// contentVersion "2026-09-10.2" x35 uniform.
const CANON = { literacy: 32, games: 7, verifierRequired: 39, dom: 39, aiPratica: 24, dev: 17, contentVersion: 35 }
const WAVE_LESSONS = ['l08', 'l09', 'l10', 'l11', 'l12', 'l13']

const countMatches = (js) => ({
  literacy: (js.match(/unitId:`ai-literacy:l/g) ?? js.match(/unitId:"ai-literacy:l/g) ?? []).length,
  literacyEvidence: (js.match(/schema:`literacy-evidence`/g) ?? js.match(/schema:"literacy-evidence"/g) ?? []).length,
  verifierRequired: (js.match(/verifierRequired:!0/g) ?? js.match(/verifierRequired:true/g) ?? []).length,
  dom: (js.match(/kind:`dom`/g) ?? js.match(/kind:"dom"/g) ?? []).length,
  games: (js.match(/schema:`teaching-game-evidence`/g) ?? js.match(/schema:"teaching-game-evidence"/g) ?? []).length,
  aiPratica: (js.match(/trackId:`ai-pratica`/g) ?? js.match(/trackId:"ai-pratica"/g) ?? []).length,
  dev: (js.match(/trackId:`dev`/g) ?? js.match(/trackId:"dev"/g) ?? []).length,
})

// ---------- local pin artifact (reference for remote equivalence) ----------
const localManifestBody = readFileSync(`${WT}/engines/codexdojo-os-prototype/dist/pilot-bundle-manifest.json`, 'utf8')
const localOsHtml = readFileSync(`${WT}/engines/codexdojo-os-prototype/dist/index.html`, 'utf8')
const localOsJsPath = localOsHtml.match(/assets\/index-[^"]*\.js/)?.[0]
const localOsJs = readFileSync(`${WT}/engines/codexdojo-os-prototype/dist/${localOsJsPath}`, 'utf8')
const localCounts = countMatches(localOsJs)

// ---------- OS surface ----------
// 1. manifest identity vs local build of the pin
const mres = await fetch(`${OS_BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('os-manifest-sha256', mres.ok && sha(mbody) === MANIFEST_SHA && mbody === localManifestBody, `${sha(mbody).slice(0, 16)} (local-identical: ${mbody === localManifestBody})`)
check('os-manifest-sourceRevision', manifest.sourceRevision === PIN, manifest.sourceRevision)
check('os-manifest-os-bytes', manifest.surfaces.os.sha256 === OS_SHA, manifest.surfaces.os.sha256.slice(0, 16))
check('os-manifest-literacy-bytes', manifest.surfaces.literacydojo.sha256 === LIT_SHA, manifest.surfaces.literacydojo.sha256.slice(0, 16))

// 2. surfaces reachable (os + 19 bundled apps)
const APPS = ['literacydojo', 'warehouse', 'wormhole', 'relay-station', 'pipeline-plant', 'checkpoint-city', 'timeline-tower', 'docking-bay', 'pixelquest', 'dojotoday', 'hash-ring', 'air-traffic', 'mission-control', 'breaker-grid', 'river-delta', 'observatory', 'freight-yard', 'lighthouse-network', 'stacks']
for (const p of ['/', ...APPS.map((a) => `/apps/${a}/`)]) {
  const r = await fetch(OS_BASE + p)
  check(`os-surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. OS app: same-origin env pins + analytics endpoint baked
const osHtml = await (await fetch(`${OS_BASE}/`)).text()
const osJsPath = osHtml.match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${OS_BASE}/${osJsPath}`)).text()
const ENV_PINS = { VITE_LITERACYDOJO_URL: 'literacydojo', VITE_WAREHOUSE_URL: 'warehouse', VITE_WORMHOLE_URL: 'wormhole', VITE_RELAY_STATION_URL: 'relay-station', VITE_PIPELINE_PLANT_URL: 'pipeline-plant', VITE_CHECKPOINT_CITY_URL: 'checkpoint-city', VITE_TIMELINE_TOWER_URL: 'timeline-tower', VITE_DOCKING_BAY_URL: 'docking-bay', VITE_PIXELDOJO_URL: 'pixelquest', VITE_DOJOTODAY_URL: 'dojotoday' }
for (const [env, app] of Object.entries(ENV_PINS)) {
  check(`os-env-pin-${env}`, osJs.includes(`${env}:\`/apps/${app}/\``), `${env} -> /apps/${app}/`)
}
check('os-analytics-endpoint-baked', osJs.includes('/__dojo/bridge/v1/analytics'), 'VITE_ANALYTICS_ENDPOINT activation baked into OS bundle')

// 4. OS static /privacidade.html (telemetry copy) — NOT the SPA shell
{
  const { r, t } = await j(`${OS_BASE}/privacidade.html`)
  check('os-privacidade-static-200', r.status === 200, String(r.status))
  check('os-privacidade-telemetry-copy', t.includes('Telemetria do produto'), 'h2 Telemetria do produto present')
  check('os-privacidade-not-spa-shell', !/\/assets\/index-[^"]*\.js/.test(t) && !t.includes('id="root"'), 'static file, no SPA bootstrap')
}

// 5. collector: cross-origin POST refused 403 (sec-fetch-site gate)
{
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  check('os-collector-cross-origin-403', r.status === 403 && b?.error === 'origin-forbidden', `${r.status} ${b?.error}`)
}
// 5b. export fail-closed for unauthenticated callers
{
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics?from=2026-09-10&to=2026-09-10`, { headers: { accept: 'application/x-ndjson' } })
  const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
  check('os-export-fail-closed', (r.status === 404 || r.status === 401) && okErr, `${r.status} ${b?.error}`)
}
// 5c. ingestion smoke: same-origin OS v1 envelope -> 202 (UUID eventId)
{
  const batch = { schemaVersion: 1, events: [{ schemaVersion: 1, eventId: '0a5d35e1-0000-4000-8000-000000001288', name: 'onboarding.started', occurredAt: new Date().toISOString(), sequence: 1, dimensions: { installationId: 'aid1288-os-smoke', sessionId: 'aid1288-os-smoke-s1' } }] }
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(batch) })
  check('os-ingestion-smoke-202', r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, `${r.status} ${JSON.stringify(b).slice(0, 80)}`)
}
// 5d. invalid envelope refused at reception (unsupported-schema)
{
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: '{"schemaVersion":9,"events":[]}' })
  check('os-invalid-envelope-rejected', r.status === 422 && b?.error === 'unsupported-schema', `${r.status} ${b?.error}`)
}

// 6. verification bridge regression (AID-448/449) + O3-C2 corpus probe
// (l08–l13 wave: retrofitted lessons answer on the regenerated corpus)
{
  const s = await fetch(`${OS_BASE}/__dojo/bridge/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ missionId: 'ai-literacy:l15', activityId: 'l15-a1' }) })
  check('os-bridge-session-responds', s.status !== 404 && s.status !== 500, String(s.status))
  for (const l of WAVE_LESSONS) {
    const w = await fetch(`${OS_BASE}/__dojo/bridge/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ missionId: `ai-literacy:${l}`, activityId: `${l}-a1` }) })
    check(`os-bridge-o3c2-${l}-session`, w.status !== 404 && w.status !== 500, `${l} on regenerated corpus: ${w.status}`)
  }
  const v = await fetch(`${OS_BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  check('os-bridge-verification-fail-closed', v.status === 400 || v.status === 403 || v.status === 422, String(v.status))
}

// 7. catalog/map integrity — O3-C2 anchors (remote == local == canonical)
{
  const remote = countMatches(osJs)
  for (const [k, canon] of Object.entries(CANON)) {
    if (k === 'contentVersion') continue // asserted separately below (uniform-35)
    check(`os-catalog-${k}`, remote[k] === canon && localCounts[k] === canon, `remote=${remote[k]} local=${localCounts[k]} canon=${canon}`)
  }
  check('os-catalog-total-39', remote.literacy + remote.games === 39, `${remote.literacy}+${remote.games}`)
  for (const l of WAVE_LESSONS) {
    check(`os-catalog-${l}-present`, osJs.includes(`ai-literacy:${l}`) && localOsJs.includes(`ai-literacy:${l}`), `${l} in mission catalog (remote+local)`)
  }
  const embeddedVersions = osJs.match(/contentVersion:`[\d.-]+`/g) ?? []
  check('os-catalog-contentVersion-uniform', embeddedVersions.length === CANON.contentVersion && embeddedVersions.every((s) => s === 'contentVersion:`2026-09-10.2`'), `${embeddedVersions.length} embedded: ${[...new Set(embeddedVersions)].join(',')}`)
  check('os-catalog-no-stale-version', !osJs.includes('2026-09-10.1') && !osJs.includes('2026-09-06.1'), 'previous contentVersion fully rotated')
}

// ---------- literacy surface ----------
// 8. remote equivalence: every local dist file byte-identical (runbook §4)
{
  const local = readFileSync('/tmp/opencode/aid1288_lit_dist_files.txt', 'utf8').trim().split('\n').filter(Boolean)
  let bad = []
  for (const rel of local) {
    const r = await fetch(`${LIT_BASE}/${rel}`)
    if (!r.ok) { bad.push(`${rel} HTTP ${r.status}`); continue }
    const buf = Buffer.from(await r.arrayBuffer())
    const loc = readFileSync(`${WT}/engines/literacyDojo/dist/${rel}`)
    if (!buf.equals(loc)) bad.push(`${rel} bytes differ`)
  }
  check('lit-dist-byte-equivalence', bad.length === 0, `${local.length} files, ${bad.length} bad ${bad.slice(0, 3).join('; ')}`)
}
// 8b. core assets 200 + SPA fallback for unknown route
for (const p of ['/', '/manifest.webmanifest', '/sw.js', '/privacidade.html', '/termos.html']) {
  const r = await fetch(LIT_BASE + p)
  check(`lit-200 ${p}`, r.status === 200, String(r.status))
}
{
  const r = await fetch(`${LIT_BASE}/rota-inexistente-aid1288`)
  const t = await r.text()
  check('lit-spa-fallback', r.status === 200 && t.includes('<div id="root"></div>'), `${r.status} shell`)
}

// 9. privacy copy (unchanged by O3-C2; anchors from PR #277 countersigned copy)
{
  const pv = await (await fetch(`${LIT_BASE}/privacidade.html`)).text()
  const tm = await (await fetch(`${LIT_BASE}/termos.html`)).text()
  check('lit-privacidade-telemetry-section', pv.includes('<h2>Telemetria do produto</h2>') && /pelo menos 5 pessoas/.test(pv) && /90 dias/.test(pv), 'h2 Telemetria do produto + k>=5/90d')
  check('lit-termos-telemetry-section', /estatísticas anônimas de uso/.test(tm), 'sentença de estatísticas anônimas')
}

// 10. collector route answers JSON (redirect BEFORE /* fallback — F4)
{
  const { r, t, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics?from=2026-09-10&to=2026-09-10`)
  const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
  check('lit-collector-route-json-fail-closed', (r.status === 404 || r.status === 401) && okErr, `${r.status} ${b?.error} ct=${r.headers.get('content-type')}`)
  check('lit-collector-not-spa-html', !t.startsWith('<!DOCTYPE'), 'não cai no fallback')
}
// 10b. cross-origin POST -> 403 JSON
{
  const { r, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  check('lit-collector-cross-origin-403', r.status === 403 && b?.error === 'origin-forbidden', `${r.status} ${b?.error}`)
}
// 10c. ingestion smoke: literacy v2 envelope -> 202 (UUID eventId; O3-C2 version)
{
  const ev = { schemaVersion: 2, source: 'literacydojo', event: 'lesson_started', eventId: '3a5d35e2-0000-4000-8000-000000001288', sessionId: '3a5d35e2-0000-4000-8000-000000001289', occurredAt: new Date().toISOString(), contentVersion: '2026-09-10.2', props: { lessonId: 'l08', lessonVersion: 1 } }
  const { r, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ schemaVersion: 2, source: 'literacydojo', events: [ev] }) })
  check('lit-ingestion-smoke-202', r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, `${r.status} ${JSON.stringify(b).slice(0, 120)}`)
}
// 10d. app baked endpoints (verifier + analytics) + O3-C2 content baked
{
  const html = await (await fetch(`${LIT_BASE}/`)).text()
  const jsPath = html.match(/assets\/index-[^"]*\.js/)?.[0]
  const js = await (await fetch(`${LIT_BASE}/${jsPath}`)).text()
  check('lit-analytics-endpoint-baked', js.includes('/__dojo/bridge/v1/analytics'), 'VITE_ANALYTICS_ENDPOINT baked')
  check('lit-verifier-endpoint-baked', js.includes('/.netlify/functions/literacy-verify'), 'VITE_LITERACY_VERIFIER_URL baked')
  check('lit-envelope-v2-baked', js.includes('schemaVersion:2') || js.includes('"schemaVersion":2'), 'emitter v2')
  check('lit-content-version-2026-09-10.2', js.includes('2026-09-10.2') && !js.includes('2026-09-10.1'), 'O3-C2 contentVersion baked, previous rotated')
  for (const l of WAVE_LESSONS) {
    check(`lit-lesson-${l}-baked`, js.includes(`lessonId:"${l}"`) || new RegExp(`"${l}"`).test(js), `${l} referenced in literacy bundle`)
  }
}

// 11. literacy-verify preserved (in-repo tracked; behavioral parity vs the
// live alias on 2 fixed-contract probes)
const LV_PASS = { schemaVersion: 1, source: 'literacydojo', verifierRequired: true, lessonId: 'l02', lessonVersion: 3, activityId: 'l02-a1', activityType: 'output_comparison', skillIds: ['entender', 'avaliar'], answer: { outputId: 'out-b', criterionIds: ['c-fontes', 'c-limites'] }, deterministicChecks: { betterOutputId: true, 'c-fontes': true, 'c-limites': true, noExtraCriteria: 0 }, score: 1, pass: true, timestamp: new Date().toISOString() }
const LV_FAIL = { schemaVersion: 1, source: 'other' }
{
  const d = await j(`${LIT_BASE}/.netlify/functions/literacy-verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(LV_PASS) })
  check('lit-verify-draft-pass', d.r.status === 200 && d.b?.verdict === 'PASS' && d.b?.source === 'independent-literacy-verifier' && d.b?.verifier_version === '1-netlify-l02-v3' && d.b?.mastery_eligible === true, `${d.r.status} ${d.b?.verdict} ${d.b?.verifier_version}`)
  const f = await j(`${LIT_BASE}/.netlify/functions/literacy-verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(LV_FAIL) })
  check('lit-verify-draft-fail-closed', f.r.status === 200 && f.b?.verdict === 'FAIL' && f.b?.independent_pass === false && f.b?.producer_writes_mastered === false, `${f.r.status} ${f.b?.verdict}`)
  const l = await j('https://aidevschool-literacydojo.netlify.app/.netlify/functions/literacy-verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(LV_PASS) })
  check('lit-verify-parity-with-live', l.r.status === 200 && l.b?.verdict === d.b?.verdict && l.b?.verifier_version === d.b?.verifier_version && l.b?.independent_pass === d.b?.independent_pass && l.b?.producer_writes_mastered === d.b?.producer_writes_mastered, `live=${l.b?.verdict}/${l.b?.verifier_version} draft=${d.b?.verdict}/${d.b?.verifier_version}`)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) { console.error('FAILED:', failed.map((f) => f.id).join(', ')); process.exit(1) }
