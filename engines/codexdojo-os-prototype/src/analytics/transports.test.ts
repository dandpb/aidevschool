import { describe, expect, it, vi } from 'vitest'
import type { AnalyticsBatch } from './batcher'
import { InMemoryAnalyticsTransport, SameOriginAnalyticsTransport } from './transports'

const batch: AnalyticsBatch = {
  schemaVersion: 1,
  events: [
    {
      schemaVersion: 1,
      eventId: 'event-1',
      name: 'onboarding.started',
      occurredAt: '2026-07-25T12:00:00.000Z',
      sequence: 1,
      dimensions: { installationId: 'installation-1', sessionId: 'session-1' },
    },
  ],
}

describe('analytics transports', () => {
  it('captures development batches without any evidence or progress dependency', async () => {
    const transport = new InMemoryAnalyticsTransport(() => {})
    await expect(transport.send(batch, 'manual')).resolves.toEqual({
      acceptedEventIds: ['event-1'],
    })
    expect(transport.batches).toEqual([batch])
  })

  it('delivers only to a same-origin endpoint and validates accepted IDs', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            acceptedEventIds: ['event-1'],
          }),
          { status: 202, headers: { 'content-type': 'application/json' } },
        ),
    )
    const transport = new SameOriginAnalyticsTransport(
      '/__dojo/bridge/v1/analytics',
      fetcher,
      undefined,
    )

    await expect(transport.send(batch, 'page-hide')).resolves.toEqual({
      acceptedEventIds: ['event-1'],
    })
    expect(fetcher).toHaveBeenCalledWith(
      '/__dojo/bridge/v1/analytics',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        body: JSON.stringify(batch),
      }),
    )
    expect(() => new SameOriginAnalyticsTransport('https://attacker.example/events')).toThrow(
      'analytics-endpoint-must-be-same-origin',
    )
  })

  it('uses a JSON beacon for page-hide delivery', () => {
    const beacon = vi.fn(() => true)
    const transport = new SameOriginAnalyticsTransport(
      '/__dojo/bridge/v1/analytics',
      vi.fn(),
      beacon,
    )

    expect(transport.sendBeacon(batch)).toBe(true)
    expect(beacon).toHaveBeenCalledWith('/__dojo/bridge/v1/analytics', expect.any(Blob))
  })
})
