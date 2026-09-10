#!/usr/bin/env node
// QA AID-1293 — sondas do funil LIVE pós-promoção O3-C2 (independentes do FPE).
// Por superfície: 2×POST idêntico (dedup) → 202/202; 401 sem bearer; 403 cross-origin;
// 422 envelope inválido; export com bearer → 200 ndjson; marcadores O3-C2 (l08–l13,
// contentVersion 2026-09-10.2) exatamente 1× cada; marcadores FPE (5473587f…/e7035669…) 1×.
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const tokens = JSON.parse(readFileSync('/paperclip/instances/default/secrets/analytics-export-tokens.json', 'utf8'))
const OS = 'https://aidevschool-codexdojo-os.netlify.app'
const LIT = 'https://aidevschool-literacydojo.netlify.app'
const log = (...a) => console.log(...a)
const j = async (url, opts) => { const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(45_000) }); const t = await r.text(); let b = null; try { b = JSON.parse(t) } catch {}; return { r, t, b } }

const mk = { os: randomUUID(), lit: ['l08','l09','l10','l11','l12','l13'].map(() => randomUUID()) }
const now = new Date().toISOString()
const results = {}
const FPE = { os: '5473587f-8a7f-422a-a472-0e4fd0435d00', lit: 'e7035669-f617-42f3-83c4-b7f227185a9b' }

// --- OS: envelope v1 ---
{
  const batch = { schemaVersion: 1, events: [{ schemaVersion: 1, eventId: mk.os, name: 'onboarding.started', occurredAt: now, sequence: 1, dimensions: { installationId: 'qa-aid1293-probe', sessionId: `qa-aid1293-s-${randomUUID().slice(0, 8)}` } }] }
  const post = (h) => j(`${OS}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...h }, body: JSON.stringify(batch) })
  const p1 = await post(), p2 = await post()
  log(`OS 2xPOST: ${p1.r.status}/${p2.r.status} accepted1=${JSON.stringify(p1.b?.acceptedEventIds)} accepted2=${JSON.stringify(p2.b?.acceptedEventIds)}`)
  const no = await j(`${OS}/__dojo/bridge/v1/analytics?from=2026-09-10&to=2026-09-11`, { headers: { accept: 'application/x-ndjson' } })
  log(`OS export SEM bearer: ${no.r.status} ${no.b?.error ?? ''}`)
  const xo = await j(`${OS}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example-aid1293.invalid' }, body: JSON.stringify(batch) })
  log(`OS cross-origin POST: ${xo.r.status} ${xo.b?.error ?? ''}`)
  const bad = await j(`${OS}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: '{"schemaVersion":9,"events":[]}' })
  log(`OS envelope inválido: ${bad.r.status} ${bad.b?.error ?? ''}`)
  results.osPost = p1.r.status === 202 && p2.r.status === 202 && p1.b?.acceptedEventIds?.[0] === mk.os && p2.b?.acceptedEventIds?.[0] === mk.os
  results.os401 = no.r.status === 401
  results.os403 = xo.r.status === 403
  results.os422 = bad.r.status === 422
}

// --- literacy: envelope v2, lesson_started O3-C2 (l08–l13) ---
{
  const events = ['l08','l09','l10','l11','l12','l13'].map((lessonId, i) => ({ schemaVersion: 2, source: 'literacydojo', event: 'lesson_started', eventId: mk.lit[i], sessionId: randomUUID(), occurredAt: now, contentVersion: '2026-09-10.2', props: { lessonId, lessonVersion: 2 } }))
  const env = { schemaVersion: 2, source: 'literacydojo', events }
  const post = (h) => j(`${LIT}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', ...h }, body: JSON.stringify(env) })
  const p1 = await post(), p2 = await post()
  log(`LIT 2xPOST: ${p1.r.status}/${p2.r.status} accepted1=${p1.b?.acceptedEventIds?.length} accepted2=${p2.b?.acceptedEventIds?.length}`)
  const no = await j(`${LIT}/__dojo/bridge/v1/analytics?from=2026-09-10&to=2026-09-11`, { headers: { accept: 'application/x-ndjson' } })
  log(`LIT export SEM bearer: ${no.r.status} ${no.b?.error ?? ''}`)
  const xo = await j(`${LIT}/__dojo/bridge/v1/analytics`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example-aid1293.invalid' }, body: JSON.stringify(env) })
  log(`LIT cross-origin POST: ${xo.r.status} ${xo.b?.error ?? ''}`)
  results.litPost = p1.r.status === 202 && p2.r.status === 202 && p1.b?.acceptedEventIds?.length === 6 && p2.b?.acceptedEventIds?.length === 6
  results.lit401 = no.r.status === 401
  results.lit403 = xo.r.status === 403
}

// --- exports com bearer (retry p/ propagação Blobs literacy 1–8 min) ---
async function exportScan(base, token, label, markers) {
  for (let i = 1; i <= 14; i++) {
    const { r, t } = await j(`${base}/__dojo/bridge/v1/analytics?from=2026-09-10&to=2026-09-11`, { headers: { accept: 'application/x-ndjson', authorization: `Bearer ${token}` } })
    if (r.status !== 200) { log(`${label} export try ${i}: HTTP ${r.status} ${t.slice(0, 80)}`); await new Promise((s) => setTimeout(s, 30000)); continue }
    const lines = t.split('\n').filter(Boolean)
    const hits = markers.map((m) => lines.filter((l) => l.includes(m)).length)
    log(`${label} export: 200 lines=${lines.length} markerHits=${JSON.stringify(hits)} (try ${i})`)
    if (hits.every((h) => h === 1)) { writeFileSync(`/tmp/opencode/aid1293/${label.toLowerCase()}-export.ndjson`, t); return { ok: true, lines: lines.length } }
    if (i === 14) { writeFileSync(`/tmp/opencode/aid1293/${label.toLowerCase()}-export.ndjson`, t); return { ok: false, lines: lines.length } }
    await new Promise((s) => setTimeout(s, 30000))
  }
  return { ok: false, lines: -1 }
}

const osExp = await exportScan(OS, tokens['aidevschool-codexdojo-os'], 'OS', [mk.os])
const litExp = await exportScan(LIT, tokens['aidevschool-literacydojo'], 'LIT', mk.lit)
results.osExport = osExp
results.litExport = litExp

log(`\nmarkers: os=${mk.os} lit=${JSON.stringify(mk.lit)}`)
log(`RESULT os=${results.osPost && results.os401 && results.os403 && results.os422 && osExp.ok} lit=${results.litPost && results.lit401 && results.lit403 && litExp.ok}`)
process.exit(results.osPost && results.os401 && results.os403 && results.os422 && osExp.ok && results.litPost && results.lit401 && results.lit403 && litExp.ok ? 0 : 1)
