// Canonical promotion pre-check library (AID-1556, P1 of audit AID-1526 §3.1).
//
// Every check is declarative: { id, family, target, run(ctx) -> { ok, detail } }.
//  - id      stable identifier (verbatim from the anchor wave; renames require
//            a conscious wave-config update — the self-test fails otherwise).
//  - family  check family (os-manifest, os-surface, os-collector, ...).
//  - target  which promotion stage the check applies to:
//            'draft'  only meaningful while validating the ephemeral draft
//            'alias'  only meaningful after re-pinning the prod alias
//            'both'   applies to draft and alias runs (default)
//  - run     pure async predicate; anchors come from the wave config (cfg),
//            never hardcoded. ctx supplies endpoints + io.
//
// Semantics are lifted 1:1 from the AID-935 anchor
// (_work-products/AID-935/precheck-65d64bca.mjs, 72 checks). Do not weaken a
// predicate without a QA countersign (see scripts/precheck/README.md).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const sha = (s) => createHash('sha256').update(s).digest('hex')

const countMatches = (src, minified, dev) =>
  (src.match(new RegExp(minified.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ??
   src.match(new RegExp(dev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ??
   []).length

// fetch wrapper adding jsonSafe() — the anchor's j() helper contract, shared
// by the CLI network run and the self-test synthetic run (no drift allowed
// between the two executors: both call runAll below).
export const wrapFetch = (impl = fetch) => async (url, opts) => {
  const r = await impl(url, opts)
  r.jsonSafe = async () => { try { return JSON.parse(await r.text()) } catch { return null } }
  return r
}

export async function runAll (checks, ctx, log = () => {}) {
  const results = []
  for (const c of checks) {
    let ok = false
    let detail = ''
    try {
      const r = await c.run(ctx)
      ok = r.ok
      detail = r.detail ?? ''
    } catch (e) {
      ok = false
      detail = `THREW ${e.message}`
    }
    results.push({ id: c.id, ok, detail })
    log(`${ok ? 'PASS' : 'FAIL'} ${c.id} ${detail}`)
  }
  return results
}

export function buildChecks (cfg) {
  const os = cfg.os
  const lit = cfg.literacy
  const checks = []
  const add = (id, family, target, run) => checks.push({ id, family, target, run })

  // ---------- family: os-manifest (3) — identity vs pinned build ----------
  const manifestOf = async (c) => {
    if (c.remember.manifest === undefined) {
      const r = await c.fetch(`${c.osBase}/pilot-bundle-manifest.json`)
      const body = await r.text()
      c.remember.manifestBody = body
      c.remember.manifestOk = r.ok
      c.remember.manifest = (() => { try { return JSON.parse(body) } catch { return null } })()
    }
    return c.remember.manifest
  }
  add('os-manifest-sha256', 'os-manifest', 'both', async (c) => {
    await manifestOf(c)
    return { ok: c.remember.manifestOk && sha(c.remember.manifestBody) === os.manifestSha256, detail: sha(c.remember.manifestBody) }
  })
  add('os-manifest-sourceRevision', 'os-manifest', 'both', async (c) => {
    const m = await manifestOf(c)
    return { ok: !!m && m.sourceRevision === os.pin, detail: m?.sourceRevision ?? 'unparseable' }
  })
  add('os-manifest-os-bytes', 'os-manifest', 'both', async (c) => {
    const m = await manifestOf(c)
    const got = m?.surfaces?.os?.sha256
    return { ok: !!m && got === os.osBundleSha256, detail: String(got ?? 'missing').slice(0, 16) }
  })

  // ---------- family: os-surface (1 + |apps|) — reachability ----------
  add('os-surface-200 /', 'os-surface', 'both', async (c) => {
    const r = await c.fetch(`${c.osBase}/`)
    return { ok: r.status === 200, detail: String(r.status) }
  })
  for (const app of os.apps) {
    add(`os-surface-200 /apps/${app}/`, 'os-surface', 'both', async (c) => {
      const r = await c.fetch(`${c.osBase}/apps/${app}/`)
      return { ok: r.status === 200, detail: String(r.status) }
    })
  }

  // ---------- family: os-bundle (|envPins| + 1) — baked config ----------
  const osJsOf = async (c) => {
    if (c.remember.osJs) return c.remember.osJs
    const html = await (await c.fetch(`${c.osBase}/`)).text()
    const jsPath = html.match(/assets\/index-[^"]*\.js/)?.[0]
    const js = await (await c.fetch(`${c.osBase}/${jsPath}`)).text()
    c.remember.osJs = js
    return js
  }
  for (const [env, app] of Object.entries(os.envPins)) {
    add(`os-env-pin-${env}`, 'os-bundle', 'both', async (c) => {
      const js = await osJsOf(c)
      return { ok: js.includes(`${env}:\`/apps/${app}/\``), detail: `${env} -> /apps/${app}/` }
    })
  }
  add('os-analytics-endpoint-baked', 'os-bundle', 'both', async (c) => {
    const js = await osJsOf(c)
    return { ok: js.includes(os.analyticsEndpoint), detail: 'VITE_ANALYTICS_ENDPOINT activation baked into OS bundle' }
  })

  // ---------- family: os-privacidade (3) — static telemetry copy ----------
  const osPrivacidadeOf = async (c) => {
    if (c.remember.osPrivacidade === undefined) {
      const r = await c.fetch(`${c.osBase}${os.privacidade.staticRoute}`)
      c.remember.osPrivacidade = await r.text()
      c.remember.osPrivacidadeStatus = r.status
    }
    return c.remember.osPrivacidade
  }
  add('os-privacidade-static-200', 'os-privacidade', 'both', async (c) => {
    await osPrivacidadeOf(c)
    return { ok: c.remember.osPrivacidadeStatus === 200, detail: String(c.remember.osPrivacidadeStatus) }
  })
  add('os-privacidade-telemetry-copy', 'os-privacidade', 'both', async (c) => ({
    ok: (await osPrivacidadeOf(c)).includes(os.privacidade.telemetryCopyMarker),
    detail: `h2 ${os.privacidade.telemetryCopyMarker} present`
  }))
  add('os-privacidade-not-spa-shell', 'os-privacidade', 'both', async (c) => {
    const t = await osPrivacidadeOf(c)
    return { ok: !/\/assets\/index-[^"]*\.js/.test(t) && !t.includes('id="root"'), detail: 'static file, no SPA bootstrap' }
  })

  // ---------- family: os-collector (4) — telemetry gate behavior ----------
  add('os-collector-cross-origin-403', 'os-collector', 'both', async (c) => {
    const r = await c.fetch(`${c.osBase}${os.analyticsEndpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    const b = await r.jsonSafe()
    return { ok: r.status === 403 && b?.error === 'origin-forbidden', detail: `${r.status} ${b?.error}` }
  })
  add('os-export-fail-closed', 'os-collector', 'both', async (c) => {
    const r = await c.fetch(`${c.osBase}${os.analyticsEndpoint}?from=${lit.collector.exportFrom}&to=${lit.collector.exportTo}`, { headers: { accept: 'application/x-ndjson' } })
    const b = await r.jsonSafe()
    const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
    return { ok: (r.status === 404 || r.status === 401) && okErr, detail: `${r.status} ${b?.error}` }
  })
  add('os-ingestion-smoke-202', 'os-collector', 'draft', async (c) => {
    const batch = {
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: os.ingestion.eventId,
        name: 'onboarding.started',
        occurredAt: new Date().toISOString(),
        sequence: 1,
        dimensions: { installationId: os.ingestion.installationId, sessionId: os.ingestion.sessionId }
      }]
    }
    const r = await c.fetch(`${c.osBase}${os.analyticsEndpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify(batch)
    })
    const b = await r.jsonSafe()
    return { ok: r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, detail: `${r.status} ${JSON.stringify(b).slice(0, 80)}` }
  })
  add('os-invalid-envelope-rejected', 'os-collector', 'draft', async (c) => {
    const r = await c.fetch(`${c.osBase}${os.analyticsEndpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: '{"schemaVersion":9,"events":[]}'
    })
    const b = await r.jsonSafe()
    return { ok: r.status === 422 && b?.error === 'unsupported-schema', detail: `${r.status} ${b?.error}` }
  })

  // ---------- family: os-bridge (2) — verification bridge regression ----------
  add('os-bridge-session-responds', 'os-bridge', 'both', async (c) => {
    const r = await c.fetch(`${c.osBase}/__dojo/bridge/v1/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ missionId: os.bridge.sessionMissionId, activityId: os.bridge.sessionActivityId })
    })
    return { ok: r.status !== 404 && r.status !== 500, detail: String(r.status) }
  })
  add('os-bridge-verification-fail-closed', 'os-bridge', 'both', async (c) => {
    const r = await c.fetch(`${c.osBase}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    return { ok: r.status === 400 || r.status === 403 || r.status === 422, detail: String(r.status) }
  })

  // ---------- family: os-catalog (8) — embedded catalog integrity ----------
  add('os-catalog-29-literacy-missions', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const n = countMatches(js, 'unitId:`ai-literacy:l', 'unitId: "ai-literacy:l')
    c.remember.catalog = { literacyMissions: n }
    return { ok: n === os.catalog.literacyMissions, detail: String(n) }
  })
  add('os-catalog-29-literacy-evidence', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const n = countMatches(js, 'schema:`literacy-evidence`', 'schema: "literacy-evidence"')
    return { ok: n === os.catalog.literacyEvidence, detail: String(n) }
  })
  add('os-catalog-verifierRequired-36', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const n = countMatches(js, 'verifierRequired:!0', 'verifierRequired: true')
    return { ok: n === os.catalog.verifierRequired, detail: String(n) }
  })
  add('os-catalog-36-dom-fallback', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const n = countMatches(js, 'kind:`dom`', 'kind: "dom"')
    return { ok: n === os.catalog.domFallbacks, detail: String(n) }
  })
  add('os-catalog-7-games', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const n = countMatches(js, 'schema:`teaching-game-evidence`', 'schema: "teaching-game-evidence"')
    c.remember.catalog.gamesEvidence = n
    return { ok: n === os.catalog.gamesEvidence, detail: String(n) }
  })
  add('os-catalog-36-total', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const l = c.remember.catalog.literacyMissions ?? countMatches(js, 'unitId:`ai-literacy:l', 'unitId: "ai-literacy:l')
    const g = c.remember.catalog.gamesEvidence ?? countMatches(js, 'schema:`teaching-game-evidence`', 'schema: "teaching-game-evidence"')
    return { ok: l + g === os.catalog.totalMissions, detail: `${l}+${g}` }
  })
  add('os-catalog-ia-pratica-20', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const n = countMatches(js, 'trackId:`ai-pratica`', 'trackId: "ai-pratica"')
    return { ok: n === os.catalog.aiPraticaTracks, detail: String(n) }
  })
  add('os-catalog-dev-9', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const n = countMatches(js, 'trackId:`dev`', 'trackId: "dev"')
    return { ok: n === os.catalog.devTracks, detail: String(n) }
  })
  add('os-catalog-contentVersion-uniform', 'os-catalog', 'both', async (c) => {
    const js = await osJsOf(c)
    const embedded = js.match(/contentVersion:`[\d.-]+`/g) ?? []
    return {
      ok: embedded.length === os.catalog.contentVersionEmbeds && embedded.every((s) => s === `contentVersion:\`${os.catalog.contentVersion}\``),
      detail: `${embedded.length} embedded: ${[...new Set(embedded)].join(',')}`
    }
  })

  // ---------- family: lit-dist (1) — remote equivalence with local build ----------
  add('lit-dist-byte-equivalence', 'lit-dist', 'draft', async (c) => {
    const listPath = c.distListFile
    const localDir = c.localDistDir
    const local = readFileSync(listPath, 'utf8').trim().split('\n').filter(Boolean)
    const bad = []
    for (const rel of local) {
      const r = await c.fetch(`${c.litBase}/${rel}`)
      if (!r.ok) { bad.push(`${rel} HTTP ${r.status}`); continue }
      const buf = Buffer.from(await r.arrayBuffer())
      const loc = readFileSync(`${localDir}/${rel}`)
      if (!buf.equals(loc)) bad.push(`${rel} bytes differ`)
    }
    return { ok: bad.length === 0, detail: `${local.length} files, ${bad.length} bad ${bad.slice(0, 3).join('; ')}` }
  })

  // ---------- family: lit-assets (|coreAssets| + 1) ----------
  for (const p of lit.coreAssets) {
    add(`lit-200 ${p}`, 'lit-assets', 'both', async (c) => {
      const r = await c.fetch(`${c.litBase}${p}`)
      return { ok: r.status === 200, detail: String(r.status) }
    })
  }
  add('lit-spa-fallback', 'lit-assets', 'both', async (c) => {
    const r = await c.fetch(`${c.litBase}${lit.spaFallback.probePath}`)
    const t = await r.text()
    return { ok: r.status === 200 && t.includes(lit.spaFallback.shellMarker), detail: `${r.status} shell` }
  })

  // ---------- family: lit-privacidade (3) — countersigned privacy copy ----------
  add('lit-privacidade-telemetry-section', 'lit-privacidade', 'both', async (c) => {
    if (c.remember.litPrivacidade === undefined) c.remember.litPrivacidade = await (await c.fetch(`${c.litBase}/privacidade.html`)).text()
    const pv = c.remember.litPrivacidade
    return {
      ok: pv.includes(lit.privacidade.telemetryHeading) && pv.includes(lit.privacidade.kAnonymityCopy) && pv.includes(lit.privacidade.retentionCopy),
      detail: 'h2 Telemetria do produto + k>=5/90d'
    }
  })
  add('lit-termos-telemetry-section', 'lit-privacidade', 'both', async (c) => {
    const tm = await (await c.fetch(`${c.litBase}/termos.html`)).text()
    return { ok: tm.includes(lit.termos.anonymousStatsCopy), detail: 'sentença de estatísticas anônimas (rodapé do termos permanece 22-08 no pin)' }
  })
  add('lit-privacidade-not-stale', 'lit-privacidade', 'both', async (c) => {
    if (c.remember.litPrivacidade === undefined) c.remember.litPrivacidade = await (await c.fetch(`${c.litBase}/privacidade.html`)).text()
    return {
      ok: c.remember.litPrivacidade.includes(lit.privacidade.lastUpdated) && !c.remember.litPrivacidade.includes(lit.privacidade.staleDate),
      detail: `privacidade datada ${lit.privacidade.lastUpdated.replace('Última atualização: ', '')}`
    }
  })

  // ---------- family: lit-collector (3 + 1) ----------
  add('lit-collector-route-json-fail-closed', 'lit-collector', 'both', async (c) => {
    const r = await c.fetch(`${c.litBase}${lit.collector.route}?from=${lit.collector.exportFrom}&to=${lit.collector.exportTo}`)
    const t = await r.text()
    const b = (() => { try { return JSON.parse(t) } catch { return null } })()
    const okErr = b?.error === 'export-unavailable' || b?.error === 'unauthorized'
    return { ok: (r.status === 404 || r.status === 401) && okErr, detail: `${r.status} ${b?.error} ct=${r.headers.get('content-type')}` }
  })
  add('lit-collector-not-spa-html', 'lit-collector', 'both', async (c) => {
    const t = await (await c.fetch(`${c.litBase}${lit.collector.route}?from=${lit.collector.exportFrom}&to=${lit.collector.exportTo}`)).text()
    return { ok: !t.startsWith('<!DOCTYPE'), detail: 'não cai no fallback' }
  })
  add('lit-collector-cross-origin-403', 'lit-collector', 'both', async (c) => {
    const r = await c.fetch(`${c.litBase}${lit.collector.route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    const b = await r.jsonSafe()
    return { ok: r.status === 403 && b?.error === 'origin-forbidden', detail: `${r.status} ${b?.error}` }
  })
  add('lit-ingestion-smoke-202', 'lit-collector', 'draft', async (c) => {
    const ev = {
      schemaVersion: 2,
      source: 'literacydojo',
      event: 'lesson_started',
      eventId: lit.ingestion.eventId,
      sessionId: lit.ingestion.sessionId,
      occurredAt: new Date().toISOString(),
      contentVersion: lit.ingestion.contentVersion,
      props: { lessonId: lit.ingestion.lessonId, lessonVersion: lit.ingestion.lessonVersion }
    }
    const r = await c.fetch(`${c.litBase}${lit.collector.route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ schemaVersion: 2, source: 'literacydojo', events: [ev] })
    })
    const b = await r.jsonSafe()
    return { ok: r.status === 202 && Array.isArray(b?.acceptedEventIds) && b.acceptedEventIds.length === 1, detail: `${r.status} ${JSON.stringify(b).slice(0, 120)}` }
  })

  // ---------- family: lit-bundle (3) — baked endpoints/emitter ----------
  const litJsOf = async (c) => {
    if (c.remember.litJs) return c.remember.litJs
    const html = await (await c.fetch(`${c.litBase}/`)).text()
    const jsPath = html.match(/assets\/index-[^"]*\.js/)?.[0]
    const js = await (await c.fetch(`${c.litBase}/${jsPath}`)).text()
    c.remember.litJs = js
    return js
  }
  add('lit-analytics-endpoint-baked', 'lit-bundle', 'both', async (c) => {
    const js = await litJsOf(c)
    return { ok: js.includes(lit.baked.analyticsEndpoint), detail: 'VITE_ANALYTICS_ENDPOINT baked' }
  })
  add('lit-verifier-endpoint-baked', 'lit-bundle', 'both', async (c) => {
    const js = await litJsOf(c)
    return { ok: js.includes(lit.baked.verifierEndpoint), detail: 'VITE_LITERACY_VERIFIER_URL baked' }
  })
  add('lit-envelope-v2-baked', 'lit-bundle', 'both', async (c) => {
    const js = await litJsOf(c)
    return { ok: js.includes(lit.baked.envelopeV2) || js.includes('"schemaVersion":2'), detail: 'emitter v2' }
  })

  // ---------- family: lit-verify (3) — independent verifier parity ----------
  const litVerifyDraftOf = async (c) => {
    if (c.remember.litVerifyDraft === undefined) {
      const r = await c.fetch(`${c.litBase}${lit.verify.route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...lit.verify.passProbe, timestamp: new Date().toISOString() }) })
      c.remember.litVerifyDraft = await r.jsonSafe()
      c.remember.litVerifyDraftStatus = r.status
    }
    return c.remember.litVerifyDraft
  }
  add('lit-verify-draft-pass', 'lit-verify', 'draft', async (c) => {
    const b = await litVerifyDraftOf(c)
    return {
      ok: c.remember.litVerifyDraftStatus === 200 && b?.verdict === 'PASS' && b?.source === 'independent-literacy-verifier' && b?.verifier_version === lit.verify.expected.verifier_version && b?.mastery_eligible === true,
      detail: `${c.remember.litVerifyDraftStatus} ${b?.verdict} ${b?.verifier_version}`
    }
  })
  add('lit-verify-draft-fail-closed', 'lit-verify', 'draft', async (c) => {
    const r = await c.fetch(`${c.litBase}${lit.verify.route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lit.verify.failProbe) })
    const b = await r.jsonSafe()
    return { ok: r.status === 200 && b?.verdict === 'FAIL' && b?.independent_pass === false && b?.producer_writes_mastered === false, detail: `${r.status} ${b?.verdict}` }
  })
  add('lit-verify-parity-with-live', 'lit-verify', 'draft', async (c) => {
    const d = await litVerifyDraftOf(c)
    const l = await c.fetch(lit.verify.liveAliasUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...lit.verify.passProbe, timestamp: new Date().toISOString() }) })
    const lb = await l.jsonSafe()
    const ok = l.status === 200 && lb?.verdict === d?.verdict && lb?.verifier_version === d?.verifier_version && lb?.independent_pass === d?.independent_pass && lb?.producer_writes_mastered === d?.producer_writes_mastered
    return { ok, detail: `live=${lb?.verdict}/${lb?.verifier_version} draft=${d?.verdict}/${d?.verifier_version}` }
  })

  return checks
}
