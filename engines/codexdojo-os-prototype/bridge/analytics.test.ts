import { describe, expect, it, vi } from 'vitest'
import type { ActionExecutor } from './actions'
import { decodeAnalyticsBatch } from './analytics'
import { routeBridgeRequest } from './router'

function analyticsEvent(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    eventId: 'event-1',
    name: 'mission.started',
    occurredAt: '2026-07-25T12:00:00.000Z',
    sequence: 1,
    dimensions: {
      installationId: 'installation-1',
      sessionId: 'session-1',
      trackId: 'dev',
      missionId: 'game-02-warehouse',
      mode: 'initial',
    },
    ...overrides,
  }
}

describe('analytics bridge route', () => {
  it('accepts a typed content-free batch without invoking verifier execution', async () => {
    const executor = vi.fn<ActionExecutor>()
    const sink = vi.fn(async () => ({ acceptedEventIds: ['event-1'] }))
    const response = await routeBridgeRequest(
      {
        method: 'POST',
        pathname: '/__dojo/bridge/v1/analytics',
        body: JSON.stringify({ schemaVersion: 1, events: [analyticsEvent()] }),
      },
      executor,
      sink,
    )

    expect(response).toEqual({ status: 202, body: { acceptedEventIds: ['event-1'] } })
    expect(sink).toHaveBeenCalledOnce()
    expect(executor).not.toHaveBeenCalled()
  })

  it.each([
    { schemaVersion: 1, events: [] },
    { schemaVersion: 1, events: [analyticsEvent({ dimensions: { installationId: 'i', sessionId: 's', question: 'learner text' } })] },
    { schemaVersion: 1, events: [analyticsEvent(), analyticsEvent()] },
    { schemaVersion: 1, events: [analyticsEvent({ evidence: { pass: true } })] },
  ])('rejects malformed, duplicate, or content-bearing batch %#', async (body) => {
    const response = await routeBridgeRequest(
      {
        method: 'POST',
        pathname: '/__dojo/bridge/v1/analytics',
        body: JSON.stringify(body),
      },
      vi.fn<ActionExecutor>(),
    )
    expect(response).toEqual({ status: 400, body: { error: 'invalid-analytics-batch' } })
  })

  it('rejects invalid sink acknowledgements', async () => {
    const response = await routeBridgeRequest(
      {
        method: 'POST',
        pathname: '/__dojo/bridge/v1/analytics',
        body: JSON.stringify({ schemaVersion: 1, events: [analyticsEvent()] }),
      },
      vi.fn<ActionExecutor>(),
      async () => ({ acceptedEventIds: ['unknown-event'] }),
    )
    expect(response).toEqual({ status: 502, body: { error: 'invalid-analytics-response' } })
  })

  it('decodes events only in increasing sequence order', () => {
    expect(decodeAnalyticsBatch({
      schemaVersion: 1,
      events: [analyticsEvent(), analyticsEvent({ eventId: 'event-2', sequence: 2 })],
    })).not.toBeNull()
    expect(decodeAnalyticsBatch({
      schemaVersion: 1,
      events: [analyticsEvent({ sequence: 2 }), analyticsEvent({ eventId: 'event-2', sequence: 1 })],
    })).toBeNull()
  })
})
