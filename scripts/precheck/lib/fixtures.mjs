// Synthetic promotion surfaces for the precheck self-test (AID-1556).
//
// Builds three local HTTP servers (OS draft, literacy draft, live alias)
// from a wave config, so the REAL check library runs end-to-end offline:
//   - control fixture satisfies every anchor (all checks must pass);
//   - mutation hooks inject one synthetic violation each (the corresponding
//     check must fail — "synthetic violations must fail").
// Hash anchors (manifest sha, bundle sha) are recomputed over the synthetic
// control bodies so the engine is exercised with real hashes, not skipped;
// mutations then serve content that mismatches those control anchors.
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

const sha = (s) => createHash('sha256').update(s).digest('hex')
const rep = (n, make) => Array.from({ length: n }, (_, i) => make(i))

export function buildOsJs (os, mut = {}) {
  const parts = []
  for (const [env, app] of Object.entries(os.envPins)) {
    if (mut.envPinMissing === env) continue
    parts.push(`${env}:\`/apps/${app}/\``)
  }
  if (!mut.osAnalyticsNotBaked) parts.push(os.analyticsEndpoint)
  const cat = os.catalog
  const missions = mut.catalogLiteracyMissions ?? cat.literacyMissions
  parts.push(...rep(missions, (i) => `unitId:\`ai-literacy:l${i + 1}\``))
  parts.push(...rep(cat.literacyEvidence, () => 'schema:`literacy-evidence`'))
  parts.push(...rep(cat.verifierRequired, () => 'verifierRequired:!0'))
  parts.push(...rep(cat.domFallbacks, () => 'kind:`dom`'))
  parts.push(...rep(cat.gamesEvidence, () => 'schema:`teaching-game-evidence`'))
  parts.push(...rep(cat.aiPraticaTracks, () => 'trackId:`ai-pratica`'))
  parts.push(...rep(cat.devTracks, () => 'trackId:`dev`'))
  if (mut.contentVersionNonUniform) {
    parts.push(...rep(cat.contentVersionEmbeds - 1, () => `contentVersion:\`${cat.contentVersion}\``))
    parts.push('contentVersion:`2026-09-05.9`')
  } else {
    parts.push(...rep(cat.contentVersionEmbeds, () => `contentVersion:\`${cat.contentVersion}\``))
  }
  return parts.join(';')
}

export function buildLitJs (lit, mut = {}) {
  const parts = []
  if (!mut.litEndpointsNotBaked) {
    parts.push(lit.baked.analyticsEndpoint)
    parts.push(lit.baked.verifierEndpoint)
    parts.push(lit.baked.envelopeV2)
  }
  return `/* synthetic literacy bundle */${parts.join(';')}`
}

export function buildOsPrivacidade (os, mut = {}) {
  if (mut.osPrivacidadeSpaShell) return '<html><body><div id="root"></div><script type="module" src="/assets/index-synth.js"></script></body></html>'
  const copy = mut.osPrivacidadeNoTelemetryCopy ? '' : `<h2>${os.privacidade.telemetryCopyMarker}</h2>`
  return `<html><body>${copy}<p>static privacy page</p></body></html>`
}

export function buildLitPrivacidade (lit, mut = {}) {
  const p = lit.privacidade
  const date = mut.litPrivacidadeStale ? p.staleDate : p.lastUpdated
  return `<html><body>${p.telemetryHeading}<p>apenas agregados com ${p.kAnonymityCopy} e retenção de ${p.retentionCopy}.</p><p>${date}</p></body></html>`
}

export function buildLitTermos (lit, mut = {}) {
  const s = mut.litTermosMissingSentence ? '' : `<p>Usamos ${lit.termos.anonymousStatsCopy}.</p>`
  return `<html><body>${s}</body></html>`
}

export function buildVerifyResponse (lit, body, mut = {}) {
  if (body?.source === lit.verify.failProbe.source) {
    if (mut.litVerifyFailOpen) return { verdict: 'PASS', independent_pass: true, producer_writes_mastered: true }
    return { verdict: 'FAIL', independent_pass: false, producer_writes_mastered: false }
  }
  const version = mut.litVerifyParityBroken ? '0-mutated-live' : lit.verify.expected.verifier_version
  const verdict = mut.litVerifyDraftFlipped ? 'FAIL' : 'PASS'
  return { verdict, source: 'independent-literacy-verifier', verifier_version: version, mastery_eligible: verdict === 'PASS', independent_pass: verdict === 'PASS', producer_writes_mastered: false }
}

const json = (res, status, obj) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(obj))
}

const readBody = (req) => new Promise((resolve) => {
  let data = ''
  req.on('data', (c) => { data += c })
  req.on('end', () => {
    try { resolve(JSON.parse(data)) } catch { resolve(null) }
  })
})

// Control anchors: hashes over the unmutated synthetic bodies.
export function syntheticAnchors (cfg) {
  const osJs = buildOsJs(cfg.os, {})
  const osSha = sha(osJs)
  const manifestBody = JSON.stringify({ sourceRevision: cfg.os.pin, surfaces: { os: { sha256: osSha } } })
  return {
    ...cfg,
    os: { ...cfg.os, manifestSha256: sha(manifestBody), osBundleSha256: osSha },
    _synthetic: { manifestBody, osSha }
  }
}

export async function startSurfaces (cfg, mut = {}) {
  const os = cfg.os
  const lit = cfg.literacy
  const servedOsJs = buildOsJs(os, mut)
  const servedManifestBody = mut.manifestBodyTampered
    ? `${cfg._synthetic.manifestBody} `
    : JSON.stringify({
        sourceRevision: mut.sourceRevision ?? os.pin,
        surfaces: { os: { sha256: mut.osBundleShaWrong ? sha('wrong-bundle') : cfg._synthetic.osSha } }
      })
  const osHtml = '<html><body><script type="module" src="/assets/index-synth.js"></script></body></html>'

  // local dist tree + list file for lit-dist-byte-equivalence
  const distDir = mkdtempSync(join(tmpdir(), 'precheck-selftest-dist-'))
  const distFiles = {
    'index.html': `<html><body>${lit.spaFallback.shellMarker}<script type="module" src="/assets/index-lit-synth.js"></script></body></html>`,
    'assets/index-lit-synth.js': buildLitJs(lit, mut),
    'assets/style.css': 'body{margin:0}',
    'manifest.webmanifest': '{"name":"literacydojo-synth"}',
    'sw.js': '// synthetic service worker',
    'privacidade.html': buildLitPrivacidade(lit, mut),
    'termos.html': buildLitTermos(lit, mut)
  }
  for (const [rel, content] of Object.entries(distFiles)) {
    const full = join(distDir, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  const distListFile = join(distDir, 'dist-files.txt')
  writeFileSync(distListFile, `${Object.keys(distFiles).join('\n')}\n`)

  const osServer = createServer(async (req, res) => {
    const p = new URL(req.url, 'http://x').pathname
    if (p === '/pilot-bundle-manifest.json') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(servedManifestBody)
      return
    }
    if (p === '/' || p === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(osHtml); return }
    if (p === '/assets/index-synth.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(servedOsJs); return }
    if (p.startsWith('/apps/') && p.endsWith('/')) {
      const app = p.slice('/apps/'.length, -1)
      if (mut.app404 === app) { res.writeHead(404); res.end('not found'); return }
      res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<html><body>app ${app}</body></html>`)
      return
    }
    if (p === os.privacidade.staticRoute) {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(buildOsPrivacidade(os, mut))
      return
    }
    if (p === '/__dojo/bridge/v1/analytics') {
      if (req.method === 'GET') {
        if (mut.osExportOpen) { res.writeHead(200, { 'content-type': 'application/x-ndjson' }); res.end('{"e":"synthetic"}\n'); return }
        json(res, 404, { error: 'export-unavailable' })
        return
      }
      const sameOrigin = req.headers['sec-fetch-site'] === 'same-origin'
      const body = await readBody(req)
      if (!sameOrigin && !mut.osCollectorCrossOriginOpen) { json(res, 403, { error: 'origin-forbidden' }); return }
      if (body?.schemaVersion === 9 && !mut.osInvalidEnvelopeAccepted) { json(res, 422, { error: 'unsupported-schema' }); return }
      if (mut.osIngestionRefuses) { json(res, 422, { error: 'unsupported-schema' }); return }
      const ids = (body?.events ?? []).map((e) => e.eventId).filter(Boolean)
      json(res, 202, { acceptedEventIds: ids.length ? ids : [os.ingestion.eventId] })
      return
    }
    if (p === '/__dojo/bridge/v1/session') {
      if (mut.osBridgeSession500) { res.writeHead(500); res.end('boom'); return }
      json(res, 200, { ok: true })
      return
    }
    if (p === '/__dojo/bridge/v1/verification') { json(res, 400, { error: 'bad-request' }); return }
    res.writeHead(404); res.end('not found')
  })

  const litServer = createServer(async (req, res) => {
    const p = new URL(req.url, 'http://x').pathname
    if (p === '/__dojo/bridge/v1/analytics') {
      if (req.method === 'GET') {
        if (mut.litCollectorServesHtml) { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!DOCTYPE html><html><body>shell</body></html>'); return }
        json(res, 404, { error: 'export-unavailable' })
        return
      }
      const sameOrigin = req.headers['sec-fetch-site'] === 'same-origin'
      const body = await readBody(req)
      if (!sameOrigin) { json(res, 403, { error: 'origin-forbidden' }); return }
      if (mut.litIngestionRefuses) { json(res, 422, { error: 'unsupported-schema' }); return }
      const ids = (body?.events ?? []).map((e) => e.eventId).filter(Boolean)
      json(res, 202, { acceptedEventIds: ids.length ? ids : [lit.ingestion.eventId] })
      return
    }
    if (p === lit.verify.route) {
      const body = await readBody(req)
      json(res, 200, buildVerifyResponse(lit, body, { ...mut, litVerifyParityBroken: false }))
      return
    }
    if (distFiles[p.slice(1)] !== undefined || p === '/') {
      const rel = p === '/' ? 'index.html' : p.slice(1)
      let content = readFileSync(join(distDir, rel), 'utf8')
      if (mut.litDistByteDiffers && rel === 'assets/style.css') content = content.replace('0', '4')
      res.writeHead(200, { 'content-type': rel.endsWith('.html') ? 'text/html' : 'text/plain' })
      res.end(content)
      return
    }
    // SPA fallback for unknown routes
    if (mut.litSpaFallback404) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(distFiles['index.html'])
  })

  const liveServer = createServer(async (req, res) => {
    const p = new URL(req.url, 'http://x').pathname
    if (p === lit.verify.route) {
      const body = await readBody(req)
      json(res, 200, buildVerifyResponse(lit, body, { litVerifyParityBroken: !!mut.litVerifyParityBroken }))
      return
    }
    res.writeHead(404); res.end('not found')
  })

  const listen = (srv) => new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv.address().port)))
  const osPort = await listen(osServer)
  const litPort = await listen(litServer)
  const livePort = await listen(liveServer)

  return {
    osBase: `http://127.0.0.1:${osPort}`,
    litBase: `http://127.0.0.1:${litPort}`,
    liveVerifyUrl: `http://127.0.0.1:${livePort}${lit.verify.route}`,
    distListFile,
    localDistDir: distDir,
    close: async () => { await Promise.all([osServer, litServer, liveServer].map((s) => new Promise((r) => s.close(r)))) }
  }
}
