// AID-421 fase (b).2 — QA Lead: matriz independente da ponte staged (paridade GAME_SPECS, AID-415)
// Uso: QA_BASE_URL=<alias|permalink> [QA_PIN=<sha>] [QA_MANIFEST_SHA=<sha256>] node qa-bridge-matrix.mjs <tag>
// Fixtures oficiais: teaching_game_producer_payloads.json @main 7acf3cf3 (idêntico ao usado pelo teste do PR #194).
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.QA_BASE_URL
const PIN = process.env.QA_PIN ?? ''          // vazio => só registra
const MANIFEST_SHA = process.env.QA_MANIFEST_SHA ?? '' // vazio => só registra
const TAG = process.argv[2] ?? 'run'
const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = process.env.QA_OUT ?? join(HERE, `out-${TAG}`)
mkdirSync(OUT, { recursive: true })

const PRODUCER_PAYLOADS = JSON.parse(readFileSync(join(HERE, 'teaching_game_producer_payloads.json'), 'utf8'))
const results = []
const notes = {}
const check = (id, ok, detail = '') => {
  results.push({ id, ok: !!ok, detail: String(detail).slice(0, 300) })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} :: ${String(detail).slice(0, 160)}`)
}
const sha = (s) => createHash('sha256').update(s).digest('hex')

// ---------- 1. Smoke de identidade ----------
const mres = await fetch(`${BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('I1 manifest-200', mres.ok, mres.status)
check('I2 manifest-sha256-declared', MANIFEST_SHA === '' ? true : sha(mbody) === MANIFEST_SHA, `want=${MANIFEST_SHA.slice(0, 12)} got=${sha(mbody).slice(0, 12)}`)
check('I3 manifest-sourceRevision==pin', PIN === '' ? true : manifest.sourceRevision === PIN, `want=${PIN.slice(0, 12)} got=${String(manifest.sourceRevision).slice(0, 12)}`)

// ---------- 2. Guardas da ponte (padrão AID-412 B1–B3) ----------
const session = await fetch(`${BASE}/__dojo/bridge/v1/session`, { headers: { 'Sec-Fetch-Site': 'same-origin' } })
const sessionBody = await session.json().catch(() => ({}))
check('B1 bridge-session-200-token', session.status === 200 && typeof sessionBody.token === 'string' && sessionBody.token.length >= 43, `${session.status} token=${(sessionBody.token || '').length}ch`)
const forbidden = await fetch(`${BASE}/__dojo/bridge/v1/session`)
const fb = await forbidden.json().catch(() => ({}))
check('B2 bridge-403-cross-origin', forbidden.status === 403 && fb.error === 'origin-forbidden', `${forbidden.status} ${JSON.stringify(fb).slice(0, 50)}`)
const unauth = await fetch(`${BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin', 'content-type': 'application/json' }, body: '{}' })
check('B3 bridge-401-no-token', unauth.status === 401, unauth.status)

const postVerify = async (record) => {
  const r = await fetch(`${BASE}/__dojo/bridge/v1/verification`, {
    method: 'POST',
    headers: { 'Sec-Fetch-Site': 'same-origin', 'content-type': 'application/json', 'x-codexdojo-bridge-token': sessionBody.token },
    body: JSON.stringify({ schemaId: 'teaching-game-evidence', schemaVersion: 1, record }),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

// ---------- 3. Payloads oficiais (port do teste do PR #194) ----------
const L1 = [
  ['key:8gl33c:0', 2], ['key:8ril9k:1', 4], ['key:a223ac:2', 2],
  ['key:9rd4jn:3', 3], ['key:e2j3i0:4', 2], ['key:8wbont:5', 5],
  ['key:1bn8kx:6', 0], ['key:8ruko7:7', 5], ['key:a1twjr:8', 5],
  ['key:7g40wq:9', 3], ['key:7xsz51:10', 1], ['key:dy7kps:11', 2],
]
const levelPayload = (level) => {
  if (level === 'L1') return [{ kind: 'warehouse-L1', predictions: L1.map(([key, shelf]) => ({ key, shelf })) }, { kind: 'voxeldoj-kv-warehouse', shelf_predictions: 12, shelf_prediction_accuracy: 1 }]
  if (level === 'L2') return [{ kind: 'warehouse-L2', probes: ['key:aa8soc:0', 'key:3wxzra:1', 'key:3q2dy3:2', 'key:3e8o2g:3', 'key:6121p0:4', 'key:eu4mct:5', 'key:7d5v1n:6', 'key:b4u2g8:7', 'key:cbeik6:8', 'key:9u4i7:9'].map((key) => ({ key, predictedAlive: true })) }, { kind: 'voxeldoj-kv-warehouse', crud_probes: 10, crud_accuracy: 1 }]
  if (level === 'L3') return [{ kind: 'warehouse-L3', probes: ['key:93ww4u:0', 'key:c89yjl:1', 'key:a96j6j:2', 'key:9rgfr:3', 'key:7dunha:4', 'key:djkdb9:5', 'key:4eecb0:6', 'key:9sjdhc:7', 'key:d2dauv:8', 'key:fx6tp8:9'].map((key) => ({ key, predictedAlive: false })), predictedSwept: 10 }, { kind: 'voxeldoj-kv-warehouse', ttl_probes: 10, ttl_accuracy: 1, expired_swept: 10, swept_prediction_ok: true }]
  return [{ kind: 'warehouse-L4', hashStrength: 'full' }, { kind: 'voxeldoj-kv-warehouse', load_skew: 1.51, hash_strength: -1 }]
}
const IDENTITIES = {
  WORMHOLE: { unit_id: 'U3-url-shortener', project: '03_url_shortener', scenario: 'wormhole' },
  'RELAY STATION': { unit_id: 'U5-websocket-chat', project: '05_websocket_chat', scenario: 'relay-station' },
  'PIPELINE PLANT': { unit_id: 'U6-file-upload', project: '06_file_upload_pipeline', scenario: 'pipeline-plant' },
}
const baseRecord = (level) => {
  const [observations, metrics] = levelPayload(level)
  return {
    source: 'voxeldojo', unit_id: 'U2-key-value-store', project: '02_key_value_store',
    scenario_id: `kv-warehouse-${level}`, game: 'KV WAREHOUSE', ts: new Date().toISOString(),
    attempt_id: `qa-aid421-${TAG}-${Math.random().toString(36).slice(2, 8)}`, pass: true,
    metrics, observations,
    review_context: { unit_kind: 'concept', scheduled_review: false, review_reason: 'deepening', scheduler_source: 'learner-substrate', verifier_required: true },
    curriculum_context: { concept: 'hash-map-backed CRUD with TTL expiration', mechanic: 'warehouse shelves + decaying crates' },
  }
}
const makeRecord = (game, level) => {
  if (game === 'KV WAREHOUSE') return baseRecord(level)
  const payload = structuredClone(PRODUCER_PAYLOADS[game][level])
  const identity = IDENTITIES[game]
  const rec = baseRecord(level)
  rec.observations = payload.observations
  rec.metrics = payload.metrics
  rec.game = game
  rec.unit_id = identity.unit_id
  rec.project = identity.project
  rec.scenario_id = `${identity.scenario}-${level}`
  return rec
}

// ---------- 4. Matriz 4 jogos × L1–L4 (16 payloads oficiais → PASS) ----------
for (const game of ['KV WAREHOUSE', 'WORMHOLE', 'RELAY STATION', 'PIPELINE PLANT']) {
  for (const level of ['L1', 'L2', 'L3', 'L4']) {
    const r = await postVerify(makeRecord(game, level))
    const receipt = r.body?.receipt ?? {}
    const verdict = receipt.verdict ?? `http-${r.status}`
    check(`M ${game} ${level} PASS`, verdict === 'PASS' && receipt.independent_pass === true && (receipt.errors ?? []).length === 0, `verdict=${verdict} errors=${JSON.stringify(receipt.errors ?? []).slice(0, 120)}`)
  }
}

// ---------- 5. Caminhos de rejeição (padrão AID-412 B4/B5 + contrato do teste do PR) ----------
{
  // 5a. métricas forjadas por jogo
  for (const game of ['KV WAREHOUSE', 'WORMHOLE', 'RELAY STATION', 'PIPELINE PLANT']) {
    const rec = makeRecord(game, 'L1')
    rec.metrics = { kind: 'forged' }
    const r = await postVerify(rec)
    const verdict = r.body?.receipt?.verdict ?? `http-${r.status}`
    check(`R-forged ${game} FAIL`, verdict === 'FAIL', verdict)
  }
  // 5b. sem observations
  for (const game of ['KV WAREHOUSE', 'WORMHOLE', 'RELAY STATION', 'PIPELINE PLANT']) {
    const rec = makeRecord(game, 'L1')
    delete rec.observations
    const r = await postVerify(rec)
    const receipt = r.body?.receipt ?? {}
    check(`R-noobs ${game} FAIL`, receipt.verdict === 'FAIL' && (receipt.errors ?? []).some((e) => String(e).includes('observations')), `${receipt.verdict} ${JSON.stringify(receipt.errors ?? []).slice(0, 100)}`)
  }
  // 5c. jogo desconhecido
  {
    const rec = makeRecord('KV WAREHOUSE', 'L1')
    rec.game = 'UNKNOWN'
    const r = await postVerify(rec)
    const receipt = r.body?.receipt ?? {}
    check('R-unknown-game FAIL', receipt.verdict === 'FAIL' && (receipt.errors ?? []).some((e) => String(e).includes('not supported')), `${receipt.verdict} ${JSON.stringify(receipt.errors ?? []).slice(0, 100)}`)
  }
  // 5d. mutação de trilha (warehouse L1: altera prateleira 0)
  {
    const rec = makeRecord('KV WAREHOUSE', 'L1')
    rec.observations.predictions[0].shelf = (rec.observations.predictions[0].shelf + 1) % 6
    const r = await postVerify(rec)
    const verdict = r.body?.receipt?.verdict ?? `http-${r.status}`
    check('R-mutated-trace FAIL', verdict === 'FAIL', verdict)
  }
  // 5e. pass=false (desacordo produtor)
  {
    const rec = makeRecord('PIPELINE PLANT', 'L1')
    rec.pass = false
    const r = await postVerify(rec)
    const verdict = r.body?.receipt?.verdict ?? `http-${r.status}`
    check('R-pass-claim FAIL', verdict === 'FAIL', verdict)
  }
}

const failed = results.filter((r) => !r.ok)
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ base: BASE, pin: PIN, manifestSha: MANIFEST_SHA, results, notes }, null, 1))
console.log(`\n${results.length - failed.length}/${results.length} checks OK -> ${OUT}/results.json`)
process.exit(failed.length === 0 ? 0 : 1)
