import { describe, expect, it, vi } from 'vitest'
import {
  AnalyticsCollector,
  InMemoryInstallationIdentityStore,
  type AnalyticsEventSink,
} from './collector'
import { AnalyticsBatcher, InMemoryAnalyticsQueueStore } from './batcher'
import type { AnalyticsEvent } from './events'

class CapturingSink implements AnalyticsEventSink {
  readonly events: AnalyticsEvent[] = []
  private sequence = 0

  enqueue(event: AnalyticsEvent): void {
    this.events.push(event)
  }

  nextSequence(): number {
    this.sequence += 1
    return this.sequence
  }
}

function idFactory() {
  let next = 0
  return (prefix: string) => `${prefix}-${++next}`
}

describe('AnalyticsCollector', () => {
  it('enriches closed events with anonymous installation and session dimensions', () => {
    const sink = new CapturingSink()
    const collector = new AnalyticsCollector(sink, {
      clock: () => new Date('2026-07-25T12:00:00.000Z'),
      createId: idFactory(),
      identityStore: new InMemoryInstallationIdentityStore(),
    })

    expect(
      collector.emit({
        name: 'mission.started',
        dimensions: { mode: 'initial' },
        context: {
          trackId: 'dev',
          missionId: 'game-02-warehouse',
          missionRunId: 'run-1',
          engineId: 'voxelDojo',
          engineVersion: '0.1.0',
          contentVersion: 'game-02-warehouse@0.1.0',
          rendererMode: 'webgl',
        },
      }),
    ).toBe(true)

    expect(sink.events).toEqual([
      {
        schemaVersion: 1,
        eventId: 'event-3',
        name: 'mission.started',
        occurredAt: '2026-07-25T12:00:00.000Z',
        sequence: 1,
        dimensions: {
          installationId: 'installation-1',
          sessionId: 'session-2',
          trackId: 'dev',
          missionId: 'game-02-warehouse',
          missionRunId: 'run-1',
          engineId: 'voxelDojo',
          engineVersion: '0.1.0',
          contentVersion: 'game-02-warehouse@0.1.0',
          rendererMode: 'webgl',
          mode: 'initial',
        },
      },
    ])
  })

  it.each([
    { name: 'hint.requested', dimensions: { question: 'learner text' } },
    { name: 'structured_attempt.submitted', dimensions: { answer: 'choice-a' } },
    { name: 'verification.state_changed', dimensions: { evidenceRecord: 'raw-record' } },
    { name: 'mission.completed', dimensions: { deterministicChecks: 'checks' } },
    { name: 'mission.started', context: { canonicalPath: 'learner/learning_state.yaml' } },
    { name: 'mission.started', checkpoint: 'opaque-engine-state' },
  ])('rejects forbidden or undeclared learner/evidence data %#', (input) => {
    const sink = new CapturingSink()
    const collector = new AnalyticsCollector(sink, {
      createId: idFactory(),
      identityStore: new InMemoryInstallationIdentityStore(),
    })

    expect(collector.emit(input as never)).toBe(false)
    expect(sink.events).toEqual([])
  })

  it('keeps analytics sink failure independent from application transitions', () => {
    const transition = vi.fn()
    const collector = new AnalyticsCollector(
      {
        enqueue: () => {
          throw new Error('delivery unavailable')
        },
        nextSequence: () => 1,
      },
      { createId: idFactory(), identityStore: new InMemoryInstallationIdentityStore() },
    )

    expect(collector.emit({ name: 'onboarding.completed' })).toBe(false)
    expect(transition).not.toHaveBeenCalled()
  })

  it('reuses installation identity while creating a new session identity', () => {
    const identityStore = new InMemoryInstallationIdentityStore()
    const firstSink = new CapturingSink()
    const secondSink = new CapturingSink()
    const createId = idFactory()
    const first = new AnalyticsCollector(firstSink, { createId, identityStore })
    const second = new AnalyticsCollector(secondSink, { createId, identityStore })

    first.emit({ name: 'journey.returned' })
    second.emit({ name: 'journey.returned' })

    expect(firstSink.events[0]?.dimensions.installationId).toBe(
      secondSink.events[0]?.dimensions.installationId,
    )
    expect(firstSink.events[0]?.dimensions.sessionId).not.toBe(
      secondSink.events[0]?.dimensions.sessionId,
    )
  })

  it('continues after the highest sequence restored by its queue', () => {
    const store = new InMemoryAnalyticsQueueStore()
    store.save([
      {
        schemaVersion: 1,
        eventId: 'event-restored',
        name: 'mission.started',
        occurredAt: '2026-07-25T12:00:00.000Z',
        sequence: 3,
        dimensions: { installationId: 'installation-1', sessionId: 'session-1' },
      },
    ])
    const batcher = new AnalyticsBatcher(
      { send: vi.fn(async () => ({ acceptedEventIds: [] })) },
      {
        store,
        batchSize: 10,
        pageTarget: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
      },
    )
    const collector = new AnalyticsCollector(batcher, {
      clock: () => new Date('2026-07-25T12:00:00.000Z'),
      createId: idFactory(),
      identityStore: new InMemoryInstallationIdentityStore(),
    })

    expect(collector.emit({ name: 'mission.started' })).toBe(true)
    expect(batcher.pendingEvents().map((item) => item.sequence)).toEqual([3, 4])
  })
})
