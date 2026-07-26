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
  skillIds: ['avaliar'],
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
})
