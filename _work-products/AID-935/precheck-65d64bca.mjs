// AID-935 promotion pre-check — telemetry activation wave (PR #277 merge
// 65d64bca; spec AID-913 GO AID-918 / QA GO AID-928; order AID-935).
// Adapted from AID-821 precheck-ef67fb06.mjs. Covers BOTH surfaces:
//  - OS draft (pilot bundle, COMMIT_REF pinned 65d64bca)
//  - literacy draft (standalone site, canonical functions + preserved
//    live literacy-verify staged; config byte-identical except functions path)
// Telemetry-specific gates per ORDEM AID-935: static /privacidade.html (OS),
// collector 403 cross-origin, analytics redirect BEFORE SPA fallback,
// literacy 'Telemetria opcional' copy on /privacidade.html + /termos.html,
// collector route answering JSON (404 export-unavailable w/o token = v2 live),
// ingestion smoke same-origin (OS v1 + literacy v2 envelopes -> 202),
// literacy-verify preserved (behavioral parity vs live alias).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const OS_BASE = process.env.OS_BASE_URL.replace(/\/$/, '')
const LIT_BASE = process.env.LIT_BASE_URL.replace(/\/$/, '')
const PIN = '65d64bca51e2e5814268f3ffa8c564a109fb5ecd'
const MANIFEST_SHA = 'a3b46052654b3c5cf95f91bc9b5427b5500e270e7cbe58cea8c0873bcb3b82b9'
const OS_SHA = '83084624aff7bf8c2a0979b7b05d5e6754d8d0e37bccd37ca7a69651993bbd53'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')
const j = async (url, opts) => { const r = await fetch(url, opts); const t = await r.text(); let b = null; try { b = JSON.parse(t) } catch {}; return { r, t, b } }

// ---------- OS surface ----------
// 1. manifest identity vs local build of the pin
const mres = await fetch(`${OS_BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('os-manifest-sha256', mres.ok && sha(mbody) === MANIFEST_SHA, sha(mbody))
check('os-manifest-sourceRevision', manifest.sourceRevision === PIN, manifest.sourceRevision)
check('os-manifest-os-bytes', manifest.surfaces.os.sha256 === OS_SHA, manifest.surfaces.os.sha256.slice(0, 16))

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
// 5b. export fail-closed for unauthenticated callers: 404 export-unavailable
// (token not configured) OR 401 unauthorized (token configured, like prod
// after the founder set ANALYTICS_EXPORT_TOKEN) — both prove the JSON route.
{
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics?from=2026-09-06&to=2026-09-06`, { headers: { accept: 'application/x-ndjson' } })
  const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
  check('os-export-fail-closed', (r.status === 404 || r.status === 401) && okErr, `${r.status} ${b?.error}`)
}
// 5c. ingestion smoke: same-origin OS v1 envelope -> 202 (1 synthetic event, AID-935 step 4)
{
  const batch = { schemaVersion: 1, events: [{ schemaVersion: 1, eventId: '0a5d35e1-0000-4000-8000-smoke00000001', name: 'onboarding.started', occurredAt: new Date().toISOString(), sequence: 1, dimensions: { installationId: 'aid935-os-smoke', sessionId: 'aid935-os-smoke-s1' } }] }
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(batch) })
  check('os-ingestion-smoke-202', r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, `${r.status} ${JSON.stringify(b).slice(0, 80)}`)
}
// 5d. invalid envelope refused at reception (unsupported-schema)
{
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: '{"schemaVersion":9,"events":[]}' })
  check('os-invalid-envelope-rejected', r.status === 422 && b?.error === 'unsupported-schema', `${r.status} ${b?.error}`)
}

// 6. verification bridge regression (AID-448/449 standard)
{
  const s = await fetch(`${OS_BASE}/__dojo/bridge/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ missionId: 'ai-literacy:l15', activityId: 'l15-a1' }) })
  check('os-bridge-session-responds', s.status !== 404 && s.status !== 500, String(s.status))
  const v = await fetch(`${OS_BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  check('os-bridge-verification-fail-closed', v.status === 400 || v.status === 403 || v.status === 422, String(v.status))
}

// 7. catalog/map integrity (unchanged by the telemetry wave; AID-821 anchors)
{
  const verifierRequired = (osJs.match(/verifierRequired:!0/g) ?? osJs.match(/verifierRequired: true/g) ?? []).length
  const domFallbacks = (osJs.match(/kind:`dom`/g) ?? osJs.match(/kind: "dom"/g) ?? []).length
  const gamesEvidence = (osJs.match(/schema:`teaching-game-evidence`/g) ?? osJs.match(/schema: "teaching-game-evidence"/g) ?? []).length
  const aiPratica = (osJs.match(/trackId:`ai-pratica`/g) ?? osJs.match(/trackId: "ai-pratica"/g) ?? []).length
  const devTrack = (osJs.match(/trackId:`dev`/g) ?? osJs.match(/trackId: "dev"/g) ?? []).length
  const literacyMissions = (osJs.match(/unitId:`ai-literacy:l/g) ?? osJs.match(/unitId: "ai-literacy:l/g) ?? []).length
  const literacyEvidence = (osJs.match(/schema:`literacy-evidence`/g) ?? osJs.match(/schema: "literacy-evidence"/g) ?? []).length
  check('os-catalog-29-literacy-missions', literacyMissions === 29, String(literacyMissions))
  check('os-catalog-29-literacy-evidence', literacyEvidence === 29, String(literacyEvidence))
  check('os-catalog-verifierRequired-36', verifierRequired === 36, String(verifierRequired))
  check('os-catalog-36-dom-fallback', domFallbacks === 36, String(domFallbacks))
  check('os-catalog-7-games', gamesEvidence === 7, String(gamesEvidence))
  check('os-catalog-36-total', literacyMissions + gamesEvidence === 36, `${literacyMissions}+${gamesEvidence}`)
  check('os-catalog-ia-pratica-20', aiPratica === 21, String(aiPratica))
  check('os-catalog-dev-9', devTrack === 17, String(devTrack))
  const embeddedVersions = osJs.match(/contentVersion:`[\d.-]+`/g) ?? []
  check('os-catalog-contentVersion-uniform', embeddedVersions.length === 32 && embeddedVersions.every((s) => s === 'contentVersion:`2026-09-06.1`'), `${embeddedVersions.length} embedded: ${[...new Set(embeddedVersions)].join(',')}`)
}

// ---------- literacy surface ----------
// 8. remote equivalence: every local dist file byte-identical (runbook §4)
{
  const local = readFileSync('/tmp/opencode/promo935/lit_dist_files.txt', 'utf8').trim().split('\n').filter(Boolean)
  let bad = []
  for (const rel of local) {
    const r = await fetch(`${LIT_BASE}/${rel}`)
    if (!r.ok) { bad.push(`${rel} HTTP ${r.status}`); continue }
    const buf = Buffer.from(await r.arrayBuffer())
    const loc = readFileSync(`/tmp/opencode/promo935/wt/engines/literacyDojo/dist/${rel}`)
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
  const r = await fetch(`${LIT_BASE}/rota-inexistente-aid935`)
  const t = await r.text()
  check('lit-spa-fallback', r.status === 200 && t.includes('<div id="root"></div>'), `${r.status} shell`)
}

// 9. privacy copy as landed in PR #277 (countersigned copy): literacy
// privacidade.html gained h2 "Telemetria do produto" (+k>=5/90d copy);
// termos.html gained the anonymous-usage-stats sentence + updated date.
// (ORDEM AID-935 paraphrased the section as 'Telemetria opcional'; the
// countersigned copy at the pin is canonical — noted in the receipt.)
{
  const pv = await (await fetch(`${LIT_BASE}/privacidade.html`)).text()
  const tm = await (await fetch(`${LIT_BASE}/termos.html`)).text()
  check('lit-privacidade-telemetry-section', pv.includes('<h2>Telemetria do produto</h2>') && /pelo menos 5 pessoas/.test(pv) && /90 dias/.test(pv), 'h2 Telemetria do produto + k>=5/90d')
  check('lit-termos-telemetry-section', /estatísticas anônimas de uso/.test(tm), 'sentença de estatísticas anônimas (rodapé do termos permanece 22-08 no pin)')
  check('lit-privacidade-not-stale', pv.includes('Última atualização: 6 de setembro de 2026') && !/Última atualização: 22 de agosto/.test(pv), 'privacidade datada 06-09')
}

// 10. collector route answers JSON (redirect BEFORE /* fallback — F4)
{
  const { r, t, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics?from=2026-09-06&to=2026-09-06`)
  const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
  check('lit-collector-route-json-fail-closed', (r.status === 404 || r.status === 401) && okErr, `${r.status} ${b?.error} ct=${r.headers.get('content-type')}`)
  check('lit-collector-not-spa-html', !t.startsWith('<!DOCTYPE'), 'não cai no fallback')
}
// 10b. cross-origin POST -> 403 JSON (proves function reached even without sec-fetch-site)
{
  const { r, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  check('lit-collector-cross-origin-403', r.status === 403 && b?.error === 'origin-forbidden', `${r.status} ${b?.error}`)
}
// 10c. ingestion smoke: literacy v2 envelope -> 202 (1 synthetic event;
// eventId/sessionId must be real UUIDs — LITERACY_UUID_PATTERN at the gate)
{
  const ev = { schemaVersion: 2, source: 'literacydojo', event: 'lesson_started', eventId: '3a5d35e2-0000-4000-8000-000000000002', sessionId: '3a5d35e2-0000-4000-8000-000000000003', occurredAt: new Date().toISOString(), contentVersion: '2026-09-06.1', props: { lessonId: 'l01', lessonVersion: 2 } }
  const { r, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ schemaVersion: 2, source: 'literacydojo', events: [ev] }) })
  check('lit-ingestion-smoke-202', r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, `${r.status} ${JSON.stringify(b).slice(0, 120)}`)
}
// 10d. app baked endpoints (verifier + analytics)
{
  const html = await (await fetch(`${LIT_BASE}/`)).text()
  const jsPath = html.match(/assets\/index-[^"]*\.js/)?.[0]
  const js = await (await fetch(`${LIT_BASE}/${jsPath}`)).text()
  check('lit-analytics-endpoint-baked', js.includes('/__dojo/bridge/v1/analytics'), 'VITE_ANALYTICS_ENDPOINT baked')
  check('lit-verifier-endpoint-baked', js.includes('/.netlify/functions/literacy-verify'), 'VITE_LITERACY_VERIFIER_URL baked')
  check('lit-envelope-v2-baked', js.includes('schemaVersion:2') || js.includes('"schemaVersion":2'), 'emitter v2')
}

// 11. literacy-verify preserved on the draft (staged from the live function's
// bytes; behavioral parity vs the live alias on 2 fixed-contract probes)
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
