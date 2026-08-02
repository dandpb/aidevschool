import { type AnalyticsEvent, analyticsEventIsValid } from './events'
import type { AnalyticsEventSink } from './collector'

export type AnalyticsFlushReason =
  | 'size'
  | 'interval'
  | 'completion'
  | 'page-hide'
  | 'retry'
  | 'manual'

export type AnalyticsBatch = {
  readonly schemaVersion: 1
  readonly events: readonly AnalyticsEvent[]
}

export interface AnalyticsBatchTransport {
  send(
    batch: AnalyticsBatch,
    reason: AnalyticsFlushReason,
  ): Promise<{ readonly acceptedEventIds: readonly string[] }>
  sendBeacon?(batch: AnalyticsBatch): boolean
}

export interface AnalyticsQueueStore {
  load(): readonly AnalyticsEvent[]
  save(events: readonly AnalyticsEvent[]): void
}

export class InMemoryAnalyticsQueueStore implements AnalyticsQueueStore {
  private events: readonly AnalyticsEvent[] = []

  load(): readonly AnalyticsEvent[] {
    return this.events
  }

  save(events: readonly AnalyticsEvent[]): void {
    this.events = [...events]
  }
}

export class LocalStorageAnalyticsQueueStore implements AnalyticsQueueStore {
  constructor(private readonly key = 'codexdojo-os.analytics.queue.v1') {}

  load(): readonly AnalyticsEvent[] {
    try {
      const raw = window.localStorage.getItem(this.key)
      if (raw === null) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(analyticsEventIsValid) : []
    } catch {
      return []
    }
  }

  save(events: readonly AnalyticsEvent[]): void {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(events))
    } catch {
      return
    }
  }
}

export interface AnalyticsScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
}

const browserScheduler: AnalyticsScheduler = {
  setTimeout(callback, delayMs) {
    return window.setTimeout(callback, delayMs)
  },
  clearTimeout(handle) {
    window.clearTimeout(handle as number)
  },
}

/** Telemetry is best effort: a sink that stays down must not grow storage without bound. */
const MAX_QUEUED_EVENTS = 500

export class AnalyticsBatcher implements AnalyticsEventSink {
  private queue: AnalyticsEvent[]
  private sequence = 0
  private readonly attempts = new Map<string, number>()
  private timer: unknown
  private inFlight = false
  private pendingReason: AnalyticsFlushReason | null = null
  private disposed = false
  private readonly store: AnalyticsQueueStore
  private readonly scheduler: AnalyticsScheduler
  private readonly pageTarget: Pick<Window, 'addEventListener' | 'removeEventListener'>
  private readonly batchSize: number
  private readonly maxRetries: number

  constructor(
    private readonly transport: AnalyticsBatchTransport,
    private readonly options: {
      readonly store?: AnalyticsQueueStore
      readonly scheduler?: AnalyticsScheduler
      readonly batchSize?: number
      readonly intervalMs?: number
      readonly maxRetries?: number
      readonly retryDelayMs?: number
      readonly pageTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>
    } = {},
  ) {
    this.store = options.store ?? new LocalStorageAnalyticsQueueStore()
    this.scheduler = options.scheduler ?? browserScheduler
    this.pageTarget = options.pageTarget ?? window
    this.batchSize = Math.max(1, options.batchSize ?? 10)
    this.maxRetries = Math.max(0, options.maxRetries ?? 2)
    const restored = this.store.load()
    this.queue = [
      ...new Map(
        restored.filter(analyticsEventIsValid).map((event) => [event.eventId, event]),
      ).values(),
    ].sort((left, right) => left.sequence - right.sequence)
    this.sequence = this.queue.reduce((maximum, event) => Math.max(maximum, event.sequence), 0)
    this.dropOverflow()
    this.pageTarget.addEventListener('pagehide', this.onPageHide)
    if (this.queue.length > 0) this.schedule('interval')
  }

  enqueue(event: AnalyticsEvent): void {
    if (this.disposed || this.queue.some((queued) => queued.eventId === event.eventId)) return
    this.sequence = Math.max(this.sequence, event.sequence)
    this.queue.push(event)
    this.dropOverflow()
    this.persist()
    if (event.name === 'mission.completed') {
      void this.flush('completion')
    } else if (this.queue.length >= this.batchSize) {
      void this.flush('size')
    } else {
      this.schedule('interval')
    }
  }

  pendingEvents(): readonly AnalyticsEvent[] {
    return [...this.queue]
  }

  nextSequence(): number {
    this.sequence += 1
    return this.sequence
  }

  async flush(reason: AnalyticsFlushReason = 'manual'): Promise<void> {
    if (this.disposed || this.queue.length === 0) return
    if (this.inFlight) {
      this.pendingReason = reason
      return
    }
    this.clearTimer()
    this.inFlight = true
    const events = this.queue.slice(0, this.batchSize)
    const batch: AnalyticsBatch = { schemaVersion: 1, events }
    try {
      const result = await this.transport.send(batch, reason)
      const accepted = new Set(result.acceptedEventIds)
      this.queue = this.queue.filter((event) => !accepted.has(event.eventId))
      for (const event of events) {
        if (accepted.has(event.eventId)) this.attempts.delete(event.eventId)
        else this.recordAttempt(event.eventId)
      }
      this.persist()
    } catch {
      for (const event of events) this.recordAttempt(event.eventId)
    } finally {
      this.inFlight = false
    }

    const pendingReason = this.pendingReason
    this.pendingReason = null
    if (this.queue.length === 0) return
    if (pendingReason !== null) {
      await this.flush(pendingReason)
      return
    }
    const canRetry = this.queue.some(
      (event) => (this.attempts.get(event.eventId) ?? 0) <= this.maxRetries,
    )
    if (canRetry) this.schedule('retry')
  }

  flushOnPageHide(): void {
    if (this.disposed || this.queue.length === 0) return
    const events = this.queue.slice(0, this.batchSize)
    const batch: AnalyticsBatch = { schemaVersion: 1, events }
    if (this.transport.sendBeacon?.(batch) === true) {
      const sent = new Set(events.map((event) => event.eventId))
      this.queue = this.queue.filter((event) => !sent.has(event.eventId))
      this.persist()
      return
    }
    void this.flush('page-hide')
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.clearTimer()
    this.pageTarget.removeEventListener('pagehide', this.onPageHide)
  }

  private readonly onPageHide = (): void => this.flushOnPageHide()

  private dropOverflow(): void {
    if (this.queue.length <= MAX_QUEUED_EVENTS) return
    for (const dropped of this.queue.splice(0, this.queue.length - MAX_QUEUED_EVENTS)) {
      this.attempts.delete(dropped.eventId)
    }
  }

  private persist(): void {
    this.store.save(this.queue)
  }

  private recordAttempt(eventId: string): void {
    this.attempts.set(eventId, (this.attempts.get(eventId) ?? 0) + 1)
  }

  private schedule(reason: 'interval' | 'retry'): void {
    if (this.disposed || this.timer !== undefined) return
    const delay =
      reason === 'retry'
        ? (this.options.retryDelayMs ?? 1_000)
        : (this.options.intervalMs ?? 15_000)
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = undefined
      void this.flush(reason)
    }, delay)
  }

  private clearTimer(): void {
    if (this.timer === undefined) return
    this.scheduler.clearTimeout(this.timer)
    this.timer = undefined
  }
}
