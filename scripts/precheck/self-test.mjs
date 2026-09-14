// Precheck self-test (AID-1556) — pattern of scripts/sdlc_guard_check.sh
// --self-test: synthetic violations MUST fail, or the gate is broken.
//
// Runs the REAL check library against synthetic local surfaces (no network):
//   0. registry audit  — the wave config's anchorCheckIds (the AID-935
//      anchor's 72 ids) must exactly match what the library generates;
//   1. control         — a fixture satisfying every anchor passes 72/72;
//   2. one mutation per scenario — each synthetic violation must flip the
//      expected check(s) to FAIL (exact expected set, no extras, no misses).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildChecks, runAll, wrapFetch } from './lib/checks.mjs'
import { syntheticAnchors, startSurfaces } from './lib/fixtures.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

// Each scenario: mutation applied to the fixture + the exact set of check ids
// that must FAIL. Semantics come from the AID-935 anchor; coupling (e.g. a
// flipped draft verdict also breaking live parity) is asserted, not excused.
const SCENARIOS = [
  { name: 'manifest bytes tampered (sha mismatch)', mut: { manifestBodyTampered: true }, expect: ['os-manifest-sha256'] },
  { name: 'manifest sourceRevision not the pin', mut: { sourceRevision: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }, expect: ['os-manifest-sha256', 'os-manifest-sourceRevision'] },
  { name: 'manifest declares wrong OS bundle sha', mut: { osBundleShaWrong: true }, expect: ['os-manifest-sha256', 'os-manifest-os-bytes'] },
  { name: 'bundled app 404', mut: { app404: 'wormhole' }, expect: ['os-surface-200 /apps/wormhole/'] },
  { name: 'env pin dropped from bundle', mut: { envPinMissing: 'VITE_WORMHOLE_URL' }, expect: ['os-env-pin-VITE_WORMHOLE_URL'] },
  { name: 'analytics endpoint not baked', mut: { osAnalyticsNotBaked: true }, expect: ['os-analytics-endpoint-baked'] },
  { name: 'OS privacidade serves SPA shell', mut: { osPrivacidadeSpaShell: true }, expect: ['os-privacidade-telemetry-copy', 'os-privacidade-not-spa-shell'] },
  { name: 'OS privacidade telemetry copy removed', mut: { osPrivacidadeNoTelemetryCopy: true }, expect: ['os-privacidade-telemetry-copy'] },
  { name: 'collector accepts cross-origin POST', mut: { osCollectorCrossOriginOpen: true }, expect: ['os-collector-cross-origin-403'] },
  { name: 'export open (no fail-closed)', mut: { osExportOpen: true }, expect: ['os-export-fail-closed'] },
  { name: 'valid v1 envelope refused', mut: { osIngestionRefuses: true }, expect: ['os-ingestion-smoke-202'] },
  { name: 'invalid envelope accepted', mut: { osInvalidEnvelopeAccepted: true }, expect: ['os-invalid-envelope-rejected'] },
  { name: 'session bridge 500', mut: { osBridgeSession500: true }, expect: ['os-bridge-session-responds'] },
  { name: 'catalog literacy missions 28 (drift)', mut: { catalogLiteracyMissions: 28 }, expect: ['os-catalog-29-literacy-missions', 'os-catalog-36-total'] },
  { name: 'contentVersion non-uniform', mut: { contentVersionNonUniform: true }, expect: ['os-catalog-contentVersion-uniform'] },
  { name: 'literacy dist byte differs from build', mut: { litDistByteDiffers: true }, expect: ['lit-dist-byte-equivalence'] },
  { name: 'SPA fallback broken (404)', mut: { litSpaFallback404: true }, expect: ['lit-spa-fallback'] },
  { name: 'privacidade stale date', mut: { litPrivacidadeStale: true }, expect: ['lit-privacidade-not-stale'] },
  { name: 'termos telemetry sentence removed', mut: { litTermosMissingSentence: true }, expect: ['lit-termos-telemetry-section'] },
  { name: 'collector route serves SPA HTML', mut: { litCollectorServesHtml: true }, expect: ['lit-collector-route-json-fail-closed', 'lit-collector-not-spa-html'] },
  { name: 'v2 envelope refused', mut: { litIngestionRefuses: true }, expect: ['lit-ingestion-smoke-202'] },
  { name: 'baked endpoints removed', mut: { litEndpointsNotBaked: true }, expect: ['lit-analytics-endpoint-baked', 'lit-verifier-endpoint-baked', 'lit-envelope-v2-baked'] },
  { name: 'draft verifier verdict flipped', mut: { litVerifyDraftFlipped: true }, expect: ['lit-verify-draft-pass', 'lit-verify-parity-with-live'] },
  { name: 'verifier fail-open on invalid source', mut: { litVerifyFailOpen: true }, expect: ['lit-verify-draft-fail-closed'] },
  { name: 'live alias diverges from draft', mut: { litVerifyParityBroken: true }, expect: ['lit-verify-parity-with-live'] }
]

async function runScenario (name, mut, expect) {
  const cfg = syntheticAnchors(JSON.parse(readFileSync(join(HERE, 'waves/AID-935-65d64bca.json'), 'utf8')))
  const surfaces = await startSurfaces(cfg, mut)
  // parity check targets the synthetic live-alias server
  const cfgForChecks = { ...cfg, literacy: { ...cfg.literacy, verify: { ...cfg.literacy.verify, liveAliasUrl: surfaces.liveVerifyUrl } } }
  const checks = buildChecks(cfgForChecks)
  const ctx = {
    osBase: surfaces.osBase,
    litBase: surfaces.litBase,
    distListFile: surfaces.distListFile,
    localDistDir: surfaces.localDistDir,
    fetch: wrapFetch(),
    remember: {}
  }
  const results = await runAll(checks, ctx)
  await surfaces.close()
  const failedIds = results.filter((r) => !r.ok).map((r) => r.id)
  const missed = expect.filter((id) => !failedIds.includes(id))
  const extra = failedIds.filter((id) => !expect.includes(id))
  const ok = missed.length === 0 && extra.length === 0
  if (!ok) {
    console.log(`    FAIL-set: got=[${failedIds.join(', ')}] expected=[${expect.join(', ')}]`)
  }
  return { ok, failedIds, ran: results.length }
}

export async function runSelfTest () {
  const cfgRaw = JSON.parse(readFileSync(join(HERE, 'waves/AID-935-65d64bca.json'), 'utf8'))
  let pass = 0
  let fail = 0

  // 0. registry audit — anti-drift tripwire
  {
    const ids = buildChecks(cfgRaw).map((c) => c.id)
    const expected = cfgRaw.anchorCheckIds
    const same = ids.length === expected.length && ids.every((id, i) => id === expected[i])
    const unique = new Set(ids).size === ids.length
    if (same && unique) {
      console.log(`PASS [registry matches anchor ${cfgRaw.wave}: ${ids.length} checks, declaration order preserved]`)
      pass++
    } else {
      console.log(`FAIL [registry drift] library=${ids.length} config=${expected.length} identical=${same} unique=${unique}`)
      fail++
    }
  }

  // 1. control — synthetic good surface must pass everything
  {
    const r = await runScenario('control', {}, [])
    if (r.ok && r.ran === cfgRaw.anchorCheckIds.length) {
      console.log(`PASS [control: ${r.ran}/${r.ran} checks pass on synthetic good surface]`)
      pass++
    } else {
      console.log(`FAIL [control: expected ${cfgRaw.anchorCheckIds.length}/${cfgRaw.anchorCheckIds.length} pass, got failures=[${r.failedIds.join(', ')}] ran=${r.ran}]`)
      fail++
    }
  }

  // 2. mutations — synthetic violations must fail exactly the expected checks
  for (const s of SCENARIOS) {
    const r = await runScenario(s.name, s.mut, s.expect)
    if (r.ok) {
      console.log(`PASS [${s.name}: ${s.expect.join(', ')} failed as required]`)
      pass++
    } else {
      console.log(`FAIL [${s.name}]`)
      fail++
    }
  }

  console.log(`self-test: ${pass} passed, ${fail} failed`)
  return fail === 0
}
