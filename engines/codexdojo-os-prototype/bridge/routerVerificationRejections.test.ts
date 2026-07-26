import { describe, expect, it, vi } from 'vitest'
import { routeBridgeRequest } from './router'
import {
  literacyReceipt,
  literacyRecord,
  teachingGameReceipt,
  teachingGameRecord,
} from './routerVerificationRecords'

describe('verification bridge rejections', () => {
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
