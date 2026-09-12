// AID-1452 F1 activation promotion pre-check — literacy + OS (2 surfaces).
// Pin 5bf86b97 (PR #342 merge 4504eaad + readiness v45 b75b26ab + hygiene
// AID-1442). ORDEM CEO AID-1451 (decisão), carrier AID-1452.
// Adapted from _work-products/AID-1288/precheck-cb128865.mjs (canonical
// ancestor _work-products/AID-935/precheck-65d64bca.mjs per
// docs/serving/PROMOTION-RUNBOOK.md §4.2).
// F1 anchors: first-touch intro (7 frases Anexo A verbatim + lead-in
// "Primeiro passo:" + framing índice 0 "first-activity-framing") baked no
// bundle literacy; badge "Comece aqui" (map-start-here-) + trilha ativa
// (map-active-chapter) no mapa OS; retenção do fix AID-1150 (onboarding a11y)
// e do fix AID-1334 (dojoToday aria-expanded + CSS guard).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const OS_BASE = process.env.OS_BASE_URL.replace(/\/$/, '')
const LIT_BASE = process.env.LIT_BASE_URL.replace(/\/$/, '')
const PIN = '5bf86b97dbb4456d90557eb823b84f9e21162438'
const MANIFEST_SHA = 'a3ac015c5df24fa09e7df91f89a5591b499c7234838712b8ac67fb87603159b3'
const OS_SHA = 'a4ed3138020817b8dcf3440728a6e159695662b4350dfe3de17a25ed5c78bc57'
const LIT_SHA = 'c10f63c02f1e0759ad78176a82a1e875db503da389fcba491e302b3baef08bce'
const WT = '/tmp/opencode/promo1452/wt'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')
const j = async (url, opts) => { const r = await fetch(url, opts); const t = await r.text(); let b = null; try { b = JSON.parse(t) } catch {}; return { r, t, b } }

// canonical counts derived at the pin from the generated missions projection
// (src/data/missions.ts @ 5bf86b97; CI-verified on the merge). F1 activation
// is presentation-only — no new missions/bindings/tracks/content bump:
// 32 unitId ai-literacy:lNN (l01..l32), 7 games, verifierRequired 39,
// kind dom 39, trackId ai-pratica 24 / dev 17, contentVersion "2026-09-10.2"
// x35 uniform (unchanged from the AID-1288 wave).
const CANON = { literacy: 32, games: 7, verifierRequired: 39, dom: 39, aiPratica: 24, dev: 17, contentVersion: 35 }
const WAVE_LESSONS = ['l01', 'l02', 'l15', 'l30']

// F1 first-touch map (Anexo A, countersign CD AID-1414 doc `input-cd` rev
// `6d38e23e`) — frases VERBATIM de engines/literacyDojo/src/domain/firstTouch.ts@pin.
const FIRST_TOUCH_LEAD_IN = 'Primeiro passo:'
const FIRST_TOUCH_PHRASES = [
  'Você vai escolher as suas respostas entre opções prontas — só clicar, nada de digitar.',
  'Você vai colocar as partes na ordem certa com as setas — nada de digitar.',
  'Você vai ler um pedido que saiu torto e marcar o que estava faltando — só marcar, nada de digitar.',
  'Você vai classificar cada item em duas categorias — só clicar, nada de digitar.',
  'Você vai montar um pedido preenchendo campos curtos — escrever pouco e direto, sem texto longo.',
  'Você vai comparar duas respostas da IA e marcar os motivos — nada de digitar.',
  'Você vai avaliar uma resposta critério por critério — só marcar, nada de digitar.',
]
const INDEX0_FRAMING = 'Primeira atividade — tente com o que você sabe; se travar, peça uma dica'

const countMatches = (js) => ({
  literacy: (js.match(/unitId:`ai-literacy:l/g) ?? js.match(/unitId:"ai-literacy:l/g) ?? []).length,
  literacyEvidence: (js.match(/schema:`literacy-evidence`/g) ?? js.match(/schema:"literacy-evidence"`/g) ?? []).length,
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
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics?from=2026-09-11&to=2026-09-12`, { headers: { accept: 'application/x-ndjson' } })
  const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
  check('os-export-fail-closed', (r.status === 404 || r.status === 401) && okErr, `${r.status} ${b?.error}`)
}
// 5c. ingestion smoke: same-origin OS v1 envelope -> 202 (UUID eventId)
{
  const batch = { schemaVersion: 1, events: [{ schemaVersion: 1, eventId: 'a1452001-0000-4000-8000-000000001452', name: 'onboarding.started', occurredAt: new Date().toISOString(), sequence: 1, dimensions: { installationId: 'aid1452-os-smoke', sessionId: 'aid1452-os-smoke-s1' } }] }
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(batch) })
  check('os-ingestion-smoke-202', r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, `${r.status} ${JSON.stringify(b).slice(0, 80)}`)
}
// 5d. invalid envelope refused at reception (unsupported-schema)
{
  const { r, b } = await j(`${OS_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: '{"schemaVersion":9,"events":[]}' })
  check('os-invalid-envelope-rejected', r.status === 422 && b?.error === 'unsupported-schema', `${r.status} ${b?.error}`)
}

// 6. verification bridge regression (AID-448/449) + corpus probes
{
  const s = await fetch(`${OS_BASE}/__dojo/bridge/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ missionId: 'ai-literacy:l15', activityId: 'l15-a1' }) })
  check('os-bridge-session-responds', s.status !== 404 && s.status !== 500, String(s.status))
  for (const l of WAVE_LESSONS) {
    const w = await fetch(`${OS_BASE}/__dojo/bridge/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ missionId: `ai-literacy:${l}`, activityId: `${l}-a1` }) })
    check(`os-bridge-corpus-${l}-session`, w.status !== 404 && w.status !== 500, `${l} on regenerated corpus: ${w.status}`)
  }
  const v = await fetch(`${OS_BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  check('os-bridge-verification-fail-closed', v.status === 400 || v.status === 403 || v.status === 422, String(v.status))
}

// 7. catalog/map integrity — anchors (remote == local == canonical)
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

// 7b. F1 activation anchors on the OS bundle (P4: badge "Comece aqui" +
// trilha ativa no header; recomendacao espelha recommendMission)
{
  check('os-f1-start-here-badge', osJs.includes('Comece aqui') && osJs.includes('map-start-here-'), 'badge textual "Comece aqui" (map-start-here-) baked')
  check('os-f1-active-chapter', osJs.includes('map-active-chapter') && osJs.includes('Trilha ativa: '), 'trilha ativa no header do mapa baked')
  check('os-f1-local-parity', localOsJs.includes('Comece aqui') && localOsJs.includes('map-start-here-') && localOsJs.includes('map-active-chapter'), 'F1 OS anchors present in the local pin build')
}

// 7c. dojoToday retention (AID-1334: aria-expanded + CSS guard
// .socrates-config[hidden]{display:none}) — bundled app /apps/dojotoday/
{
  const dtHtml = await (await fetch(`${OS_BASE}/apps/dojotoday/`)).text()
  const dtCssPath = dtHtml.match(/assets\/index-[^"]*\.css/)?.[0]
  const dtJsPath = dtHtml.match(/assets\/index-[^"]*\.js/)?.[0]
  const dtCss = await (await fetch(`${OS_BASE}/apps/dojotoday/${dtCssPath}`)).text()
  const dtJs = await (await fetch(`${OS_BASE}/apps/dojotoday/${dtJsPath}`)).text()
  check('dt-a11y-css-hidden-guard', dtCss.includes('socrates-config[hidden]'), '.socrates-config[hidden]{display:none} baked')
  check('dt-a11y-aria-expanded', dtJs.includes('aria-expanded') && dtJs.includes('soc-config'), 'toggle aria-expanded wiring baked')
}

// ---------- literacy surface ----------
// 8. remote equivalence: every local dist file byte-identical (runbook §4)
{
  const local = readFileSync('/tmp/opencode/promo1452/lit_dist_files.txt', 'utf8').trim().split('\n').filter(Boolean).map((p) => p.replace(/^dist\//, ''))
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
  const r = await fetch(`${LIT_BASE}/rota-inexistente-aid1452`)
  const t = await r.text()
  check('lit-spa-fallback', r.status === 200 && t.includes('<div id="root"></div>'), `${r.status} shell`)
}

// 9. privacy copy (anchors from PR #277 countersigned copy)
{
  const pv = await (await fetch(`${LIT_BASE}/privacidade.html`)).text()
  const tm = await (await fetch(`${LIT_BASE}/termos.html`)).text()
  check('lit-privacidade-telemetry-section', pv.includes('<h2>Telemetria do produto</h2>') && /pelo menos 5 pessoas/.test(pv) && /90 dias/.test(pv), 'h2 Telemetria do produto + k>=5/90d')
  check('lit-termos-telemetry-section', /estatísticas anônimas de uso/.test(tm), 'sentença de estatísticas anônimas')
}

// 10. collector route answers JSON (redirect BEFORE /* fallback — F4)
{
  const { r, t, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics?from=2026-09-11&to=2026-09-12`)
  const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
  check('lit-collector-route-json-fail-closed', (r.status === 404 || r.status === 401) && okErr, `${r.status} ${b?.error} ct=${r.headers.get('content-type')}`)
  check('lit-collector-not-spa-html', !t.startsWith('<!DOCTYPE'), 'não cai no fallback')
}
// 10b. cross-origin POST -> 403 JSON
{
  const { r, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  check('lit-collector-cross-origin-403', r.status === 403 && b?.error === 'origin-forbidden', `${r.status} ${b?.error}`)
}
// 10c. ingestion smoke: literacy v2 envelope -> 202 (UUID eventId)
{
  const ev = { schemaVersion: 2, source: 'literacydojo', event: 'lesson_started', eventId: 'b1452002-0000-4000-8000-000000001452', sessionId: 'b1452002-0000-4000-8000-000000001453', occurredAt: new Date().toISOString(), contentVersion: '2026-09-10.2', props: { lessonId: 'l02', lessonVersion: 3 } }
  const { r, b } = await j(`${LIT_BASE}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ schemaVersion: 2, source: 'literacydojo', events: [ev] }) })
  check('lit-ingestion-smoke-202', r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, `${r.status} ${JSON.stringify(b).slice(0, 120)}`)
}
// 10d. app baked endpoints (verifier + analytics) + content baked
{
  const html = await (await fetch(`${LIT_BASE}/`)).text()
  const jsPath = html.match(/assets\/index-[^"]*\.js/)?.[0]
  const js = await (await fetch(`${LIT_BASE}/${jsPath}`)).text()
  check('lit-analytics-endpoint-baked', js.includes('/__dojo/bridge/v1/analytics'), 'VITE_ANALYTICS_ENDPOINT baked')
  check('lit-verifier-endpoint-baked', js.includes('/.netlify/functions/literacy-verify'), 'VITE_LITERACY_VERIFIER_URL baked')
  check('lit-envelope-v2-baked', js.includes('schemaVersion:2') || js.includes('"schemaVersion":2'), 'emitter v2')
  check('lit-content-version-2026-09-10.2', js.includes('2026-09-10.2') && !js.includes('2026-09-10.1') && !js.includes('2026-09-06.1'), 'contentVersion baked, previous rotated')

  // 10e. F1 activation anchors (P1/P2/P3): first-touch na intro + framing
  // índice 0 — frases do Anexo A VERBATIM (firstTouch.ts@pin)
  check('lit-f1-lead-in', js.includes(FIRST_TOUCH_LEAD_IN), `"${FIRST_TOUCH_LEAD_IN}" baked`)
  for (const [i, phrase] of FIRST_TOUCH_PHRASES.entries()) {
    check(`lit-f1-phrase-${i + 1}`, js.includes(phrase), phrase.slice(0, 50))
  }
  check('lit-f1-index0-framing', js.includes(INDEX0_FRAMING) && js.includes('first-activity-framing'), 'framing índice 0 + testid baked')

  // 10f. retenção do fix AID-1150 (a11y onboarding: h1 ref+tabIndex -1,
  // contador sr-only "Etapa N de 5", title) — mesma sonda do redeploy AID-1450
  check('lit-aid1150-onboarding-title', js.includes('id:"onboarding-title"') && js.includes('tabIndex:-1'), 'h1 id=onboarding-title com tabIndex -1')
  check('lit-aid1150-sr-only-step-counter', js.includes('sr-only') && js.includes('Etapa '), 'contador de etapa sr-only baked')
  check('lit-aid1150-document-title', html.includes('LiteracyDojo — IA com confiança no trabalho'), '<title> do onboarding carregado')
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
