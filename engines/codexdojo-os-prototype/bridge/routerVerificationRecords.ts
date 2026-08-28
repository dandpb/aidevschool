export const literacyRecord = {
  schemaVersion: 1,
  source: 'literacydojo',
  attemptId: 'attempt-1',
  lessonId: 'l02',
  lessonVersion: 3,
  activityId: 'l02-a1',
  activityType: 'output_comparison',
  skillIds: ['avaliar'],
  deterministicChecks: { confidence: 1e-7, better: true },
  score: 1,
  pass: true,
  timestamp: '2026-07-25T12:00:00.000Z',
  verifierRequired: true,
}

export function literacyReceipt(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    verdict: 'PASS',
    context_isolated: true,
    source: 'independent-literacy-verifier',
    evidence_digest: 'a'.repeat(64),
    lesson_id: 'l02',
    activity_id: 'l02-a1',
    attempt_id: 'attempt-1',
    activity_type: 'output_comparison',
    score: 1,
    producer_pass_claim: true,
    independent_pass: true,
    mastery_eligible: true,
    errors: [],
    producer_writes_mastered: false,
    max_producer_claim: 'completed',
    ...overrides,
  }
}

export const teachingGameRecord = {
  source: 'voxeldojo',
  unit_id: 'U2-key-value-store',
  project: '02_key_value_store',
  scenario_id: 'kv-warehouse-L1',
  game: 'KV WAREHOUSE',
  attempt_id: 'kv-warehouse-L1-attempt-1',
  ts: '2026-07-25T12:00:00.000Z',
  pass: true,
  metrics: {
    kind: 'voxeldoj-kv-warehouse',
    shelf_predictions: 12,
    shelf_prediction_accuracy: 1,
  },
  observations: {
    kind: 'warehouse-L1',
    predictions: [
      { key: 'key:8gl33c:0', shelf: 2 },
      { key: 'key:8ril9k:1', shelf: 4 },
      { key: 'key:a223ac:2', shelf: 2 },
      { key: 'key:9rd4jn:3', shelf: 3 },
      { key: 'key:e2j3i0:4', shelf: 2 },
      { key: 'key:8wbont:5', shelf: 5 },
      { key: 'key:1bn8kx:6', shelf: 0 },
      { key: 'key:8ruko7:7', shelf: 5 },
      { key: 'key:a1twjr:8', shelf: 5 },
      { key: 'key:7g40wq:9', shelf: 3 },
      { key: 'key:7xsz51:10', shelf: 1 },
      { key: 'key:dy7kps:11', shelf: 2 },
    ],
  },
  review_context: {
    unit_kind: 'concept',
    scheduled_review: false,
    review_reason: 'deepening',
    scheduler_source: 'learner-substrate',
    verifier_required: true,
  },
  curriculum_context: {
    concept: 'hash-map-backed CRUD with TTL expiration',
    mechanic: 'warehouse shelves + decaying crates',
  },
}

export const wormholeRecord = {
  ...teachingGameRecord,
  unit_id: 'U3-url-shortener',
  project: '03_url_shortener',
  scenario_id: 'wormhole-L4',
  game: 'WORMHOLE',
  metrics: {
    resolution_chosen: 'salted',
    resolved_code: '1drY',
    resolved_unique: true,
    redirect_ok: true,
  },
  observations: {
    kind: 'wormhole-L4',
    colliderUrl: 'https://wormhole.collide/163',
    chosenResolution: 'salted',
  },
  curriculum_context: {
    concept: 'short-code generation + collision handling',
    mechanic: 'wormhole code-gates between planets',
  },
}

export const relayRecord = {
  ...teachingGameRecord,
  unit_id: 'U5-websocket-chat',
  project: '05_websocket_chat',
  scenario_id: 'relay-station-L4',
  game: 'RELAY STATION',
  metrics: {
    kind: 'voxeldoj-relay-station',
    target_correct: true,
    rejoined_fanout: true,
    delivered_after: 4,
    was_dropped: true,
  },
  observations: {
    kind: 'relay-L4',
    reconnectedId: 'st-2',
  },
  curriculum_context: {
    concept: 'persistent conns + fan-out + heartbeat',
    mechanic: 'orbiting relay stations, laser links',
  },
}

export function teachingGameReceipt(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    schema_version: 1,
    verdict: 'PASS',
    context_isolated: true,
    source: 'independent-teaching-game-verifier',
    evidence_digest: 'a'.repeat(64),
    unit_id: 'U2-key-value-store',
    project: '02_key_value_store',
    scenario_id: 'kv-warehouse-L1',
    game: 'KV WAREHOUSE',
    attempt_id: 'kv-warehouse-L1-attempt-1',
    producer_pass_claim: true,
    independent_pass: true,
    errors: [],
    producer_writes_mastered: false,
    max_producer_claim: 'completed',
    canonical_gate_status: 'not-submitted',
    canonical_gate_reason: 'learner-attempt-and-gate-eligibility-required',
    ...overrides,
  }
}
