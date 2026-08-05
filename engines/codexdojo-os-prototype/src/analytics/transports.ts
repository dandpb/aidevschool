import { sameOriginPath } from '../sameOrigin'
import type { AnalyticsBatch, AnalyticsBatchTransport, AnalyticsFlushReason } from './batcher'

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type BeaconSender = (url: string | URL, data?: BodyInit | null) => boolean

declare global {
  interface Window {
    __codexdojoAnalytics?: {
      readonly batches: AnalyticsBatch[]
      readonly events: AnalyticsBatch['events'][number][]
    }
  }
}

function captureDevelopmentBatch(batch: AnalyticsBatch): void {
  if (typeof window === 'undefined') return
  const capture = window.__codexdojoAnalytics ?? { batches: [], events: [] }
  capture.batches.push(batch)
  capture.events.push(...batch.events)
  window.__codexdojoAnalytics = capture
}

export class InMemoryAnalyticsTransport implements AnalyticsBatchTransport {
  readonly batches: AnalyticsBatch[] = []

  constructor(
    private readonly capture: (batch: AnalyticsBatch) => void = captureDevelopmentBatch,
  ) {}

  async send(
    batch: AnalyticsBatch,
    _reason: AnalyticsFlushReason,
  ): Promise<{ readonly acceptedEventIds: readonly string[] }> {
    this.batches.push(batch)
    this.capture(batch)
    return { acceptedEventIds: batch.events.map((event) => event.eventId) }
  }

  sendBeacon(batch: AnalyticsBatch): boolean {
    this.batches.push(batch)
    this.capture(batch)
    return true
  }
}

function acceptedIds(value: unknown): readonly string[] {
  if (
    typeof value !== 'object' ||
    value === null ||
    !Array.isArray((value as { acceptedEventIds?: unknown }).acceptedEventIds) ||
    !(value as { acceptedEventIds: unknown[] }).acceptedEventIds.every(
      (id) => typeof id === 'string',
    )
  ) {
    throw new Error('invalid-analytics-response')
  }
  return (value as { acceptedEventIds: string[] }).acceptedEventIds
}

export class SameOriginAnalyticsTransport implements AnalyticsBatchTransport {
  private readonly pathname: string

  constructor(
    endpoint = '/__dojo/bridge/v1/analytics',
    private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
    private readonly beacon: BeaconSender | undefined = globalThis.navigator?.sendBeacon?.bind(
      globalThis.navigator,
    ),
  ) {
    this.pathname = sameOriginPath(endpoint, 'analytics-endpoint-must-be-same-origin')
  }

  async send(
    batch: AnalyticsBatch,
    reason: AnalyticsFlushReason,
  ): Promise<{ readonly acceptedEventIds: readonly string[] }> {
    const response = await this.fetcher(this.pathname, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: reason === 'page-hide',
    })
    if (!response.ok) throw new Error('analytics-delivery-failed')
    const acceptedEventIds = acceptedIds(await response.json())
    const submitted = new Set(batch.events.map((event) => event.eventId))
    if (acceptedEventIds.some((eventId) => !submitted.has(eventId))) {
      throw new Error('invalid-analytics-response')
    }
    return { acceptedEventIds }
  }

  sendBeacon(batch: AnalyticsBatch): boolean {
    if (this.beacon === undefined) return false
    return this.beacon(
      this.pathname,
      new Blob([JSON.stringify(batch)], { type: 'application/json' }),
    )
  }
}
