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
  attempt_id: undefined,
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
  attempt_id: undefined,
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

export const pipelinePlantRecord = {
  ...teachingGameRecord,
  unit_id: 'U6-file-upload',
  project: '06_file_upload_pipeline',
  scenario_id: 'pipeline-plant-L4',
  game: 'PIPELINE PLANT',
  attempt_id: undefined,
  metrics: {
    kind: 'voxeldoj-pipeline-plant',
    size: 1308,
    capacity: 100,
    mode: 'buffered',
    overflow_predicted: true,
    overflow_actual: true,
    peak_mem: 1308,
    delivered: 200,
    overflowed: 1108,
    stalled: false,
    drained: 100,
    drain_rate: 0.1,
    time_ms: 1000,
  },
  observations: {
    kind: 'pipeline-plant-L4',
    predictedOverflow: true,
  },
  curriculum_context: {
    concept: 'streaming vs buffering + bounded memory',
    mechanic: 'fluid tank + pipe + chunked slugs',
  },
}

export const checkpointCityRecord = {
  ...teachingGameRecord,
  unit_id: 'U7-rest-api-auth',
  project: '07_rest_api_auth',
  scenario_id: 'checkpoint-city-L4',
  game: 'CHECKPOINT CITY',
  attempt_id: undefined,
  metrics: {
    kind: 'voxeldoj-checkpoint-city',
    reorder_correct: true,
    given_order: 'rate-limit,logging,auth',
    player_order: 'logging,auth,rate-limit',
    target_order: 'logging,auth,rate-limit',
    probe_prediction_ok: true,
    probe_answer: 'auth',
  },
  observations: {
    kind: 'checkpoint-city-L4',
    order: ['logging', 'auth', 'rate-limit'],
    probePrediction: 'auth',
  },
  curriculum_context: {
    concept: 'middleware layers + JWT verification',
    mechanic: 'concentric city walls, badge gates',
  },
}

export const timelineTowerRecord = {
  ...teachingGameRecord,
  unit_id: 'U8-event-driven',
  project: '08_event_driven_order_system',
  scenario_id: 'timeline-tower-L4',
  game: 'TIMELINE TOWER',
  attempt_id: undefined,
  metrics: {
    kind: 'voxeldoj-timeline-tower',
    order_status_view_ok: true,
    shipment_list_view_ok: true,
    same_log_two_views: true,
    views_correct: 2,
  },
  observations: {
    kind: 'timeline-tower-L4',
    predictedOrderStatus: 'cancelled',
    predictedShipped: false,
  },
  curriculum_context: {
    concept: 'append-only log + projection replay',
    mechanic: 'tower of stacked event floors',
  },
}

export const dockingBayRecord = {
  ...teachingGameRecord,
  unit_id: 'U9-plugin-system',
  project: '09_plugin_system',
  scenario_id: 'docking-bay-L1',
  game: 'DOCKING BAY',
  attempt_id: undefined,
  metrics: {
    kind: 'voxeldoj-docking-bay',
    dock_predictions: 6,
    dock_prediction_accuracy: 1,
    contracts_checked: 6,
  },
  observations: {
    kind: 'docking-bay-L1',
    dockPredictions: [
      { podId: 'pod-0', predictedDock: true },
      { podId: 'pod-1', predictedDock: false },
      { podId: 'pod-2', predictedDock: false },
      { podId: 'pod-3', predictedDock: true },
      { podId: 'pod-4', predictedDock: false },
      { podId: 'pod-5', predictedDock: false },
    ],
  },
  curriculum_context: {
    concept: 'sandboxing + interface contracts',
    mechanic: 'docking pods, force-field sandbox',
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
