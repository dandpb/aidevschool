import { describe, expect, it, vi } from 'vitest'
import {
  type AnalyticsBatch,
  AnalyticsBatcher,
  type AnalyticsBatchTransport,
  type AnalyticsFlushReason,
  InMemoryAnalyticsQueueStore,
} from './batcher'
import type { AnalyticsEvent } from './events'

function event(
  id: string,
  sequence: number,
  name: AnalyticsEvent['name'] = 'mission.started',
): AnalyticsEvent {
  return {
    schemaVersion: 1,
    eventId: id,
    name,
    occurredAt: '2026-07-25T12:00:00.000Z',
    sequence,
    dimensions: { installationId: 'installation-1', sessionId: 'session-1' },
  }
}

function pageTarget() {
  return { addEventListener: vi.fn(), removeEventListener: vi.fn() }
}

describe('AnalyticsBatcher', () => {
  it('preserves order, deduplicates event IDs, and allows only one in-flight batch', async () => {
    let resolveSend: ((value: { acceptedEventIds: readonly string[] }) => void) | undefined
    const send = vi.fn(
      (_batch: AnalyticsBatch, _reason: AnalyticsFlushReason) =>
        new Promise<{ acceptedEventIds: readonly string[] }>((resolve) => {
          resolveSend = resolve
        }),
    )
    const batcher = new AnalyticsBatcher(
      { send },
      {
        store: new InMemoryAnalyticsQueueStore(),
        batchSize: 10,
        pageTarget: pageTarget(),
      },
    )
    batcher.enqueue(event('event-1', 1))
    batcher.enqueue(event('event-1', 1))
    batcher.enqueue(event('event-2', 2))

    const firstFlush = batcher.flush('manual')
    const secondFlush = batcher.flush('manual')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0]?.[0].events.map((item) => item.eventId)).toEqual([
      'event-1',
      'event-2',
    ])
    resolveSend?.({ acceptedEventIds: ['event-1', 'event-2'] })
    await Promise.all([firstFlush, secondFlush])
    expect(send).toHaveBeenCalledTimes(1)
    expect(batcher.pendingEvents()).toEqual([])
  })

  it('retries only within the bound and retains undelivered events', async () => {
    const callbacks: Array<() => void> = []
    const scheduler = {
      setTimeout: vi.fn((callback: () => void) => {
        callbacks.push(callback)
        return callbacks.length
      }),
      clearTimeout: vi.fn(),
    }
    const transport: AnalyticsBatchTransport = {
      send: vi.fn(async () => {
        throw new Error('offline')
      }),
    }
    const batcher = new AnalyticsBatcher(transport, {
      store: new InMemoryAnalyticsQueueStore(),
      scheduler,
      maxRetries: 1,
      pageTarget: pageTarget(),
    })
    batcher.enqueue(event('event-1', 1))
    callbacks.length = 0
    await batcher.flush('manual')
    expect(callbacks).toHaveLength(1)
    callbacks.shift()?.()
    await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(2))
    expect(callbacks).toHaveLength(0)
    expect(batcher.pendingEvents().map((item) => item.eventId)).toEqual(['event-1'])
  })

  it('flushes completion immediately and removes only accepted IDs', async () => {
    const transport: AnalyticsBatchTransport = {
      send: vi.fn(async (batch: AnalyticsBatch, _reason: AnalyticsFlushReason) => ({
        acceptedEventIds: [batch.events[0]?.eventId ?? ''],
      })),
    }
    const batcher = new AnalyticsBatcher(transport, {
      store: new InMemoryAnalyticsQueueStore(),
      pageTarget: pageTarget(),
    })
    batcher.enqueue(event('event-1', 1))
    batcher.enqueue(event('event-2', 2, 'mission.completed'))
    await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1))

    expect(transport.send).toHaveBeenCalledWith(expect.anything(), 'completion')
    expect(batcher.pendingEvents().map((item) => item.eventId)).toEqual(['event-2'])
  })

  it('does not retry a partial ACK when the remaining event exhausted its limit', async () => {
    const callbacks: Array<() => void> = []
    const scheduler = {
      setTimeout: vi.fn((callback: () => void) => {
        callbacks.push(callback)
        return callbacks.length
      }),
      clearTimeout: vi.fn(),
    }
    const batcher = new AnalyticsBatcher(
      {
        send: vi.fn(async () => ({ acceptedEventIds: ['event-1'] })),
      },
      {
        store: new InMemoryAnalyticsQueueStore(),
        scheduler,
        maxRetries: 0,
        pageTarget: pageTarget(),
      },
    )
    batcher.enqueue(event('event-1', 1))
    batcher.enqueue(event('event-2', 2))
    callbacks.length = 0

    await batcher.flush('manual')

    expect(callbacks).toHaveLength(0)
    expect(batcher.pendingEvents().map((item) => item.eventId)).toEqual(['event-2'])
  })

  it('uses beacon on page hide without invoking the async transport', () => {
    const transport: AnalyticsBatchTransport = {
      send: vi.fn(async () => ({ acceptedEventIds: [] })),
      sendBeacon: vi.fn(() => true),
    }
    const batcher = new AnalyticsBatcher(transport, {
      store: new InMemoryAnalyticsQueueStore(),
      pageTarget: pageTarget(),
    })
    batcher.enqueue(event('event-1', 1))
    batcher.flushOnPageHide()

    expect(transport.sendBeacon).toHaveBeenCalledOnce()
    expect(transport.send).not.toHaveBeenCalled()
    expect(batcher.pendingEvents()).toEqual([])
  })
})
