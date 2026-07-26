import { describe, expect, it, vi } from 'vitest'
import { runProcess } from './processRunner'
import { routeBridgeRequest } from './router'

describe('engine bridge router', () => {
  it('executes one exact allowlisted POST action', async () => {
    // Given
    const executor = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '12 passed', stderr: '' })

    // When
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/engines/miniMaxEvolutionEngine/actions/prepare-workflow',
      body: '{}',
    }, executor)

    // Then
    expect(response).toEqual({
      status: 200,
      body: { ok: true, summary: 'Ação concluída', output: '12 passed' },
    })
    expect(executor).toHaveBeenCalledOnce()
  })

  it.each([
    ['GET', '/__dojo/bridge/v1/engines/openclaw/actions/preview-checklist', '{}', 405],
    ['POST', '/__dojo/bridge/v1/engines/openclaw/actions/run', '{}', 404],
    ['POST', '/__dojo/bridge/v1/engines/../../etc/actions/read', '{}', 404],
    ['POST', '/__dojo/bridge/v1/engines/openclaw/actions/preview-checklist', '{bad', 400],
  ])('rejects %s %s without invoking a process', async (method, pathname, body, status) => {
    // Given
    const executor = vi.fn()

    // When
    const response = await routeBridgeRequest({ method, pathname, body }, executor)

    // Then
    expect(response.status).toBe(status)
    expect(executor).not.toHaveBeenCalled()
  })
})

const literacyRecord = {
  schemaVersion: 1,
  source: 'literacydojo',
  attemptId: 'attempt-1',
  lessonId: 'l02',
  lessonVersion: 3,
  activityId: 'l02-a1',
  activityType: 'output_comparison',
  skillIds: ['entender', 'avaliar'],
  deterministicChecks: { confidence: 1e-7, better: true },
  score: 1,
  pass: true,
  timestamp: '2026-07-25T12:00:00.000Z',
  verifierRequired: true,
}

function literacyReceipt(overrides: Readonly<Record<string, unknown>> = {}) {
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

const teachingGameRecord = {
  source: 'voxeldojo',
  unit_id: 'U2-key-value-store',
  project: '02_key_value_store',
  scenario_id: 'kv-warehouse-L1',
  game: 'KV WAREHOUSE',
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

const wormholeRecord = {
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

const relayRecord = {
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

function teachingGameReceipt(overrides: Readonly<Record<string, unknown>> = {}) {
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

describe('verification bridge router', () => {
  it('accepts exponent-valued evidence from the real Python digest authority', async () => {
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'literacy-evidence',
        schemaVersion: 1,
        record: literacyRecord,
      }),
    }, runProcess)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toMatchObject({
      evidence_digest: expect.stringMatching(/^[0-9a-f]{64}$/),
      lesson_id: 'l02',
      producer_pass_claim: true,
    })
  })

  it('dispatches a declared schema to one fixed verifier process', async () => {
    const executor = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify(literacyReceipt()),
      stderr: '',
    })

    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'literacy-evidence',
        schemaVersion: 1,
        record: literacyRecord,
      }),
    }, executor)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toEqual(literacyReceipt())
    expect(executor).toHaveBeenCalledWith(
      expect.objectContaining({
        executable: 'python3',
        args: ['-m', 'learner.gate.literacy_bridge'],
      }),
      JSON.stringify(literacyRecord),
    )
  })

  it('dispatches teaching-game evidence to the fixed WAREHOUSE verifier', async () => {
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'teaching-game-evidence',
        schemaVersion: 1,
        record: teachingGameRecord,
      }),
    }, runProcess)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toMatchObject({
      source: 'independent-teaching-game-verifier',
      verdict: 'PASS',
      unit_id: 'U2-key-value-store',
      scenario_id: 'kv-warehouse-L1',
      producer_pass_claim: true,
      canonical_gate_status: 'not-submitted',
    })
  })

  it.each([
    ['WORMHOLE', wormholeRecord],
    ['RELAY STATION', relayRecord],
  ])('dispatches %s evidence through the same fixed teaching-game process', async (_, record) => {
    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'teaching-game-evidence',
        schemaVersion: 1,
        record,
      }),
    }, runProcess)

    expect(response.status).toBe(200)
    expect(response.body.receipt).toMatchObject({
      source: 'independent-teaching-game-verifier',
      verdict: 'PASS',
      unit_id: record.unit_id,
      project: record.project,
      scenario_id: record.scenario_id,
      game: record.game,
      producer_pass_claim: true,
    })
  })

  it('does not expose a fake canonical gate route', async () => {
    const executor = vi.fn()

    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/gate',
      body: '{}',
    }, executor)

    expect(response).toEqual({ status: 404, body: { error: 'not-found' } })
    expect(executor).not.toHaveBeenCalled()
  })

  it.each([
    [{ schemaId: 'unknown', schemaVersion: 1, record: literacyRecord }, 404],
    [{ schemaId: 'literacy-evidence', schemaVersion: 1, record: literacyRecord, command: 'rm' }, 400],
    [{ schemaId: 'literacy-evidence', schemaVersion: 1, record: literacyRecord, path: '/etc/passwd' }, 400],
    [{ schemaId: 'literacy-evidence', schemaVersion: 1, evidenceDigest: 'browser-digest', record: literacyRecord }, 400],
  ])('rejects unsupported schemas and browser process controls', async (body, status) => {
    const executor = vi.fn()

    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify(body),
    }, executor)

    expect(response.status).toBe(status)
    expect(executor).not.toHaveBeenCalled()
  })

  it.each([
    ['GET', '{}', 405],
    ['POST', '{bad', 400],
    ['POST', JSON.stringify({ padding: 'x'.repeat(5_000) }), 413],
  ])('rejects malformed verification input', async (method, body, status) => {
    const executor = vi.fn()
    const response = await routeBridgeRequest({
      method,
      pathname: '/__dojo/bridge/v1/verification',
      body,
    }, executor)

    expect(response.status).toBe(status)
    expect(executor).not.toHaveBeenCalled()
  })

  it.each([
    ['digest', { evidence_digest: 'A'.repeat(64) }],
    ['lesson', { lesson_id: 'l03' }],
    ['activity', { activity_id: 'other' }],
    ['attempt', { attempt_id: 'other' }],
    ['type', { activity_type: 'choice' }],
    ['score', { score: 0 }],
    ['pass', { producer_pass_claim: false }],
  ])('rejects a verifier response with mismatched %s identity', async (_field, override) => {
    const executor = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify(literacyReceipt(override)),
      stderr: '',
    })

    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'literacy-evidence',
        schemaVersion: 1,
        record: literacyRecord,
      }),
    }, executor)

    expect(response).toEqual({ status: 422, body: { error: 'invalid-verifier-response' } })
  })

  it.each([
    ['digest', { evidence_digest: 'A'.repeat(64) }],
    ['unit', { unit_id: 'U3-url-shortener' }],
    ['project', { project: '03_url_shortener' }],
    ['scenario', { scenario_id: 'wormhole-L1' }],
    ['game', { game: 'WORMHOLE' }],
    ['pass', { producer_pass_claim: false }],
  ])('rejects a teaching-game receipt with altered %s binding', async (_, override) => {
    const executor = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify(teachingGameReceipt(override)),
      stderr: '',
    })

    const response = await routeBridgeRequest({
      method: 'POST',
      pathname: '/__dojo/bridge/v1/verification',
      body: JSON.stringify({
        schemaId: 'teaching-game-evidence',
        schemaVersion: 1,
        record: teachingGameRecord,
      }),
    }, executor)

    expect(response).toEqual({ status: 422, body: { error: 'invalid-verifier-response' } })
  })
})
