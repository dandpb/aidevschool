import { describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_EVENT_NAMES,
  type AnalyticsEventName,
  type AnalyticsScalar,
  analyticsEventInputIsValid,
  analyticsEventIsValid,
  emitAnalyticsSafely,
} from './events'

const VOCABULARY_CASES = [
  { name: 'onboarding.completed', key: 'recommendationChanged', accepted: true, rejected: 'true' },
  { name: 'mission.started', key: 'mode', accepted: 'review', rejected: 'guided' },
  { name: 'mission.completed', key: 'result', accepted: 'completed', rejected: 'partial' },
  { name: 'structured_attempt.submitted', key: 'activityType', accepted: 'choice', rejected: 'essay' },
  { name: 'structured_attempt.passed', key: 'activityType', accepted: 'rubric_review', rejected: 'essay' },
  { name: 'hint.requested', key: 'mode', accepted: 'hint', rejected: 'answer' },
  { name: 'hint.requested', key: 'source', accepted: 'fallback', rejected: 'remote' },
  { name: 'hint.requested', key: 'outcome', accepted: 'answered', rejected: 'ignored' },
  { name: 'retry.requested', key: 'reason', accepted: 'retry', rejected: 'manual' },
  { name: 'review.started', key: 'reason', accepted: 'due', rejected: 'manual' },
  { name: 'verification.state_changed', key: 'state', accepted: 'verified', rejected: 'unknown' },
  { name: 'verification.state_changed', key: 'verdict', accepted: 'PASS', rejected: 'MAYBE' },
  { name: 'renderer.degraded', key: 'reason', accepted: 'context-lost', rejected: 'slow' },
  { name: 'renderer.degraded', key: 'fallback', accepted: 'dom', rejected: 'webgl' },
]

function envelope(name: AnalyticsEventName, dimensions: Record<string, AnalyticsScalar> = {}) {
  return {
    schemaVersion: 1,
    eventId: 'event-1',
    name,
    occurredAt: '2026-07-25T12:00:00.000Z',
    sequence: 1,
    dimensions: { installationId: 'installation-1', sessionId: 'session-1', ...dimensions },
  }
}

describe('OS analytics event contract', () => {
  it('accepts exactly the 12 public event names with minimal input and envelope data', () => {
    expect(ANALYTICS_EVENT_NAMES).toEqual([
      'onboarding.started',
      'onboarding.completed',
      'journey.returned',
      'mission.started',
      'mission.completed',
      'structured_attempt.submitted',
      'structured_attempt.passed',
      'hint.requested',
      'retry.requested',
      'review.started',
      'verification.state_changed',
      'renderer.degraded',
    ])
    expect(ANALYTICS_EVENT_NAMES).toHaveLength(12)
    expect(ANALYTICS_EVENT_NAMES.every((name) => analyticsEventInputIsValid({ name }))).toBe(true)
    expect(ANALYTICS_EVENT_NAMES.every((name) => analyticsEventIsValid(envelope(name)))).toBe(true)
  })

  it.each(VOCABULARY_CASES)(
    'accepts and rejects representative values for $name.$key',
    ({ name, key, accepted, rejected }) => {
      expect(analyticsEventInputIsValid({ name, dimensions: { [key]: accepted } })).toBe(true)
      expect(analyticsEventInputIsValid({ name, dimensions: { [key]: rejected } })).toBe(false)
    },
  )

  it('accepts representative vocabulary values in serialized envelopes', () => {
    for (const { name, key, accepted } of VOCABULARY_CASES) {
      const input = { name, dimensions: { [key]: accepted } }
      expect(analyticsEventInputIsValid(input)).toBe(true)
      if (analyticsEventInputIsValid(input)) {
        expect(analyticsEventIsValid(envelope(input.name, input.dimensions))).toBe(true)
      }
    }
  })

  it.each([
    null,
    [],
    {},
    { name: 'unknown.event' },
    { name: 'mission.started', extra: true },
    { name: 'mission.started', dimensions: [] },
    { name: 'mission.started', dimensions: { extra: true } },
    { name: 'mission.started', dimensions: { mode: '' } },
    { name: 'mission.started', dimensions: { mode: 'x'.repeat(129) } },
    { name: 'mission.started', dimensions: { mode: Number.NaN } },
    { name: 'mission.started', dimensions: { mode: {} } },
  ])('rejects undeclared or unbounded input data %#', (input) => {
    expect(analyticsEventInputIsValid(input)).toBe(false)
  })

  it('accepts every context vocabulary and identifier field', () => {
    expect(analyticsEventInputIsValid({
      name: 'mission.started',
      context: {
        trackId: 'ai-pratica',
        missionId: 'mission:1/@v1',
        missionRunId: 'run-1',
        engineId: 'literacyDojo',
        engineVersion: '1.0.0',
        contentVersion: 'content@1',
        rendererMode: 'canvas2d',
      },
    })).toBe(true)
    for (const context of [
      { trackId: 'dev' },
      { engineId: 'voxelDojo' },
      { rendererMode: 'webgl' },
      { rendererMode: 'dom' },
      { rendererMode: 'none' },
    ]) {
      expect(analyticsEventInputIsValid({ name: 'mission.started', context })).toBe(true)
    }
  })

  it.each([
    null,
    [],
    { extra: 'value' },
    { missionId: '' },
    { missionId: 'x'.repeat(129) },
    { missionId: 'bad value' },
    { missionId: 1 },
    { trackId: 'ops' },
    { engineId: 'other' },
    { rendererMode: 'svg' },
  ])('rejects invalid context keys, identifiers, and enums %#', (context) => {
    expect(analyticsEventInputIsValid({ name: 'mission.started', context })).toBe(false)
  })

  it.each([
    null,
    [],
    {},
    { ...envelope('mission.started'), extra: true },
    { ...envelope('mission.started'), schemaVersion: 2 },
    { ...envelope('mission.started'), eventId: 1 },
    { ...envelope('mission.started'), eventId: '' },
    { ...envelope('mission.started'), eventId: 'x'.repeat(129) },
    { ...envelope('mission.started'), name: 'unknown.event' },
    { ...envelope('mission.started'), occurredAt: 1 },
    { ...envelope('mission.started'), occurredAt: 'not-a-date' },
    { ...envelope('mission.started'), sequence: 1.5 },
    { ...envelope('mission.started'), sequence: 0 },
    { ...envelope('mission.started'), dimensions: null },
    { ...envelope('mission.started'), dimensions: { installationId: 'installation-1' } },
    { ...envelope('mission.started'), dimensions: { sessionId: 'session-1' } },
    { ...envelope('mission.started'), dimensions: { installationId: 1, sessionId: 'session-1' } },
    { ...envelope('mission.started'), dimensions: { installationId: 'bad id', sessionId: 'session-1' } },
    { ...envelope('mission.started'), dimensions: { installationId: 'installation-1', sessionId: 1 } },
    { ...envelope('mission.started'), dimensions: { installationId: 'installation-1', sessionId: 'bad id' } },
    envelope('mission.started', { trackId: 'ops' }),
    envelope('mission.started', { mode: 'guided' }),
  ])('rejects malformed serialized envelopes %#', (event) => {
    expect(analyticsEventIsValid(event)).toBe(false)
  })

  it('returns the adapter result and returns false when the adapter throws', () => {
    const emit = vi.fn(() => true)
    expect(emitAnalyticsSafely({ emit }, { name: 'journey.returned' })).toBe(true)
    expect(emit).toHaveBeenCalledWith({ name: 'journey.returned' })
    expect(emitAnalyticsSafely({
      emit: () => {
        throw new Error('offline')
      },
    }, { name: 'journey.returned' })).toBe(false)
  })
})
