import { describe, expect, it } from 'vitest'
import { decodeEngineMessage } from './validation'

const source = window
const expected = {
  sourceWindow: source,
  origin: 'http://127.0.0.1:5178',
  hostSessionId: 'host-1',
  missionRunId: 'run-1',
  engineId: 'literacyDojo' as const,
}

function readyEvent(overrides: Record<string, unknown> = {}): MessageEvent<unknown> {
  return new MessageEvent('message', {
    source,
    origin: expected.origin,
    data: {
      protocol: 'aidevschool.host-engine',
      version: '1.0',
      type: 'engine.ready',
      messageId: 'message-1',
      hostSessionId: expected.hostSessionId,
      missionRunId: expected.missionRunId,
      engineId: expected.engineId,
      sentAt: '2026-07-25T12:00:00.000Z',
      payload: {
        engineVersion: '0.1.0',
        contentVersion: 'test.1',
        capabilities: ['mission-state', 'evidence'],
      },
      ...overrides,
    },
  })
}

describe('host protocol validation', () => {
  it('accepts a source-bound correlated message', () => {
    expect(decodeEngineMessage(readyEvent(), expected)).toMatchObject({
      ok: true,
      message: { type: 'engine.ready' },
    })
  })

  it('rejects stale runs, wrong origins, and malformed payloads', () => {
    expect(decodeEngineMessage(readyEvent({ missionRunId: 'stale' }), expected)).toEqual({
      ok: false,
      code: 'correlation-mismatch',
    })
    expect(
      decodeEngineMessage(
        new MessageEvent('message', {
          source,
          origin: 'https://attacker.example',
          data: readyEvent().data,
        }),
        expected,
      ),
    ).toEqual({ ok: false, code: 'origin-mismatch' })
    expect(decodeEngineMessage(readyEvent({ payload: {} }), expected)).toEqual({
      ok: false,
      code: 'invalid-payload',
    })
    expect(
      decodeEngineMessage(
        readyEvent({
          payload: {
            engineVersion: '0.1.0',
            contentVersion: 'test.1',
            capabilities: ['mission-state', 'evidence', 'checkpoint'],
          },
        }),
        expected,
      ),
    ).toEqual({ ok: false, code: 'invalid-payload' })
  })

  it('accepts only closed renderer lifecycle states', () => {
    expect(
      decodeEngineMessage(
        readyEvent({
          type: 'renderer.state',
          payload: {
            revision: 1,
            requested: 'auto',
            active: 'dom',
            status: 'degraded',
            reason: 'creation-failed',
          },
        }),
        expected,
      ),
    ).toMatchObject({ ok: true, message: { type: 'renderer.state' } })
    expect(
      decodeEngineMessage(
        readyEvent({
          type: 'renderer.state',
          payload: {
            revision: 1,
            requested: 'auto',
            active: 'dom',
            status: 'degraded',
            reason: 'learner-failed',
          },
        }),
        expected,
      ),
    ).toEqual({ ok: false, code: 'invalid-payload' })
  })
})
