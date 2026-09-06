// AID-821 ONDA C1 single promotion pre-check (adapted from AID-666
// precheck-4c2aeb7.mjs / AID-630 precheck-7653822.mjs).
// Expected pin: ef67fb06 (merge PR #267 — ONDA C1 retrofit l15–l17 v1->v2
// +3 atividades + contentVersion 2026-09-04.1; countersign QA AID-816 @ 077d73fe,
// re-grant v29 AID-819; order AID-817 relay AID-821).
// Scope of this precheck per ORDEM AID-817/AID-821: identity/build of the
// deployed artifact vs the local build of the pin (manifest sha, sourceRevision,
// os surface sha, surfaces reachable, same-origin env pins, embedded
// contentVersion uniformity catalog<->bindings, 36-mission map intact,
// ia_pratica 20 / dev 9, wave lessons l15/l16/l17 v2 with a1/a2/a3 embedded,
// old contentVersions absent, bridge alive). §0.a git-diff check ran on the
// repo (4c2aeb7..ef67fb06 = 167 files, 0 in l21/l22/l27–l29). §0.b moderator
// sanity + §0.c deploy_id re-registration belong to UX post-promotion.
import { createHash } from 'node:crypto'

const BASE = process.env.QA_BASE_URL.replace(/\/$/, '')
const PIN = 'ef67fb06be7d8eb6ff3fe8d16e9c65024d4ac118'
const MANIFEST_SHA = '1f79089d3b3683727f92e9e094111223a24ed132612579b21ef4aee09102adf2'
const OS_SHA = 'f605b3c611c65424752fbf10b9497cdfbb7e90f9f2f3d9c3e6fe3c2380a06157'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')

// 1. remote manifest identity (byte-identical to the local build of the pin)
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
  check(`os-env-pin-${env}`, osJs.includes(`${env}:\`/apps/${app}/\``), `${env} must resolve to /apps/${app}/`)
}

// 4. embedded literacy app declares the wave contentVersion (single bump rode
// with the C1 landing; canonical validator propagated it to every literacy
// mission + both tracks). The prior version 2026-09-02.3 may appear ONLY as
// the retrofit-notice registry key (canonical source:
// engines/literacyDojo/src/domain/retrofitNotice.ts on the pin) — any other
// occurrence would be real drift.
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-09-04.1', litJs.includes('2026-09-04.1'))
{
  const staleHits = [...new Set(litJs.match(/2026-09-\d+\.\d+/g) ?? [])].filter((v) => v !== '2026-09-04.1')
  const allowed = (v) => v === '2026-09-02.3' && (litJs.match(new RegExp([...v].map((c) => /[.]/.test(c) ? `\\${c}` : c).join(''), 'g')) ?? []).length === (litJs.match(/"2026-09-02\.3":/g) ?? []).length
  check('literacy-old-contentVersion-absent', staleHits.every(allowed), `stale strings: ${staleHits.join(',')} (2026-09-02.3 allowed only as retrofit-registry key)`)
}

// 4b. embedded OS catalog: map intact (29 literacy = 20 ai-pratica + 9 dev; + 7
// games = 36) and catalog<->bindings consistency: every embedded
// contentVersion is the new one (32 strings = catalog header + 2 track
// headers + 29 runtimes).
{
  const verifierRequired = (osJs.match(/verifierRequired:!0/g) ?? osJs.match(/verifierRequired: true/g) ?? []).length
  const domFallbacks = (osJs.match(/kind:`dom`/g) ?? osJs.match(/kind: "dom"/g) ?? []).length
  const gamesEvidence = (osJs.match(/schema:`teaching-game-evidence`/g) ?? osJs.match(/schema: "teaching-game-evidence"/g) ?? []).length
  const aiPratica = (osJs.match(/trackId:`ai-pratica`/g) ?? osJs.match(/trackId: "ai-pratica"/g) ?? []).length
  const devTrack = (osJs.match(/trackId:`dev`/g) ?? osJs.match(/trackId: "dev"/g) ?? []).length
  const literacyMissions = (osJs.match(/unitId:`ai-literacy:l/g) ?? osJs.match(/unitId: "ai-literacy:l/g) ?? []).length
  const literacyEvidence = (osJs.match(/schema:`literacy-evidence`/g) ?? osJs.match(/schema: "literacy-evidence"/g) ?? []).length
  check('catalog-embeds-29-literacy-missions', literacyMissions === 29, String(literacyMissions))
  check('catalog-embeds-29-literacy-evidence', literacyEvidence === 29, String(literacyEvidence))
  check('catalog-embeds-verifierRequired-evidence', verifierRequired === 36, `${verifierRequired} hits (29 literacy + 7 games)`)
  check('catalog-embeds-36-dom-fallback', domFallbacks === 36, `${domFallbacks} hits`)
  check('catalog-embeds-7-game-missions', gamesEvidence === 7, String(gamesEvidence))
  check('catalog-embeds-36-total', literacyMissions + gamesEvidence === 36, `${literacyMissions}+${gamesEvidence}`)
  check('catalog-counts-ia-pratica-20', aiPratica === 21, `${aiPratica} hits = 20 missions + 1 track header`)
  check('catalog-counts-dev-9', devTrack === 17, `${devTrack} hits = 9 literacy + 7 games + 1 track header`)
  const embeddedVersions = osJs.match(/contentVersion:`[\d.-]+`/g) ?? []
  const uniform = embeddedVersions.length === 32 && embeddedVersions.every((s) => s === 'contentVersion:`2026-09-04.1`')
  check('os-catalog-contentVersion-uniform-2026-09-04.1', uniform, `${embeddedVersions.length} embedded: ${[...new Set(embeddedVersions)].join(',')}`)
}

// 5. ONDA C1 wave shape in the published literacy motor: l15/l16/l17 carry
// all three activities each (a1/a2/a3 — the +a3 retrofit), same quoted-id
// standard as AID-666 §5; retrofit-notice registry embeds the wave mapping
// (S1/S2 mechanism, retrofitNotice.ts on the pin).
{
  for (const l of ['l15', 'l16', 'l17']) {
    check(`literacy-3-activities-${l}`, [`"${l}-a1"`, `"${l}-a2"`, `"${l}-a3"`].every((s) => litJs.includes(s)), `${l} a1/a2/a3`)
  }
  check('literacy-retrofit-registry-c1', /"2026-09-04\.1":\s*\[[^\]]*"l15"[^\]]*"l16"[^\]]*"l17"[^\]]*\]/.test(litJs) || litJs.includes('"2026-09-04.1":["l15","l16","l17"]'), 'wave mapping l15/l16/l17 under the new bump')
  check('literacy-retrofit-notice-s1', litJs.includes('Esta lição ganhou atividades novas'))
  const osHtml = await (await fetch(`${BASE}/`)).text()
  check('os-js-resolved', Boolean(osHtml && osJs.length > 1000), osJsPath ?? 'none')
}

// 6. same-origin verification bridge alive (session 200-shape, verification
// refuses forged/absent evidence — AID-448/AID-449 regression kept from the
// AID-666 standard, fetch-level only)
{
  const s = await fetch(`${BASE}/__dojo/bridge/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ missionId: 'ai-literacy:l15', activityId: 'l15-a1' }) })
  check('bridge-session-responds', s.status !== 404 && s.status !== 500, String(s.status))
  const v = await fetch(`${BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })
  check('bridge-verification-fail-closed', v.status === 400 || v.status === 403 || v.status === 422, String(v.status))
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) { console.error('FAILED:', failed.map((f) => f.id).join(', ')); process.exit(1) }
