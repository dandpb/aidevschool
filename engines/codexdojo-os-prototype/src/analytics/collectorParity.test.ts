import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_EVENT_NAMES,
  type AnalyticsEvent,
  EVENT_VOCABULARIES,
  analyticsEventIsValid,
} from './events'
import {
  ANALYTICS_EVENT_NAMES as COLLECTOR_EVENT_NAMES,
  CONTEXT_KEYS as COLLECTOR_CONTEXT_KEYS,
  CONTEXT_VOCABULARIES as COLLECTOR_CONTEXT_VOCABULARIES,
  EVENT_VOCABULARIES as COLLECTOR_EVENT_VOCABULARIES,
  validateAnalyticsEvent,
} from '../../../../learner/gate/netlify-functions/dojo-analytics-collector.mjs'
import { CONTEXT_KEYS, CONTEXT_VOCABULARIES } from './events'

// AID-470 F1 parity: the staged same-origin collector must accept and reject
// exactly the events this engine emits. The canonical vocabulary lives here
// (events.ts); the collector projection lives in learner/gate. This test fails
// CI when either side drifts, so a browser can never ship an event shape the
// collector would silently drop (or accept beyond the boundary).

const OUT_OF_VOCABULARY = '__out-of-vocabulary__'

function validEventFor(name: (typeof ANALYTICS_EVENT_NAMES)[number]): AnalyticsEvent {
  const dimensions: Record<string, string | number | boolean> = {
    installationId: 'installation-1',
    sessionId: 'session-1',
  }
  for (const [key, vocabulary] of Object.entries(EVENT_VOCABULARIES[name])) {
    if (vocabulary !== undefined) dimensions[key] = vocabulary[0]
  }
  return {
    schemaVersion: 1,
    eventId: `event-${name}`,
    name,
    occurredAt: '2026-08-31T12:00:00.000Z',
    sequence: 1,
    dimensions: dimensions as AnalyticsEvent['dimensions'],
  }
}

describe('collector parity with the OS analytics vocabulary', () => {
  it('exposes the identical closed event vocabulary', () => {
    expect([...COLLECTOR_EVENT_NAMES].sort()).toEqual([...ANALYTICS_EVENT_NAMES].sort())
    expect(COLLECTOR_EVENT_VOCABULARIES).toEqual(EVENT_VOCABULARIES)
    expect([...COLLECTOR_CONTEXT_KEYS].sort()).toEqual([...CONTEXT_KEYS].sort())
    expect(COLLECTOR_CONTEXT_VOCABULARIES).toEqual(CONTEXT_VOCABULARIES)
  })

  it('agrees on every canonical valid event', () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      const event = validEventFor(name)
      expect(analyticsEventIsValid(event), name).toBe(true)
      expect(validateAnalyticsEvent(event), name).toBe(true)
    }
  })

  it('agrees on every dimension vocabulary violation', () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      for (const key of Object.keys(EVENT_VOCABULARIES[name])) {
        const event = {
          ...validEventFor(name),
          dimensions: { ...validEventFor(name).dimensions, [key]: OUT_OF_VOCABULARY },
        }
        expect(analyticsEventIsValid(event), `${name}.${key}`).toBe(false)
        expect(validateAnalyticsEvent(event), `${name}.${key}`).toBe(false)
      }
    }
  })

  it('agrees on envelope, identity, and context violations', () => {
    const base = validEventFor('mission.started')
    const mutations: unknown[] = [
      { ...base, schemaVersion: 2 },
      { ...base, eventId: '' },
      { ...base, name: 'lesson_completed' },
      { ...base, occurredAt: 'yesterday' },
      { ...base, sequence: 0 },
      { ...base, dimensions: { ...base.dimensions, unknownKey: 'x' } },
      { ...base, dimensions: { installationId: 'installation 1', sessionId: 'session-1' } },
      { ...base, dimensions: { installationId: 'installation-1' } },
      { ...base, dimensions: { ...base.dimensions, trackId: 'third-track' } },
      { ...base, dimensions: { ...base.dimensions, engineId: 'pixelDojo' } },
      { ...base, dimensions: { ...base.dimensions, freeText: 'y'.repeat(200) } },
      { ...base, dimensions: { ...base.dimensions, nested: { object: true } } },
      null,
    ]
    for (const mutation of mutations) {
      expect(analyticsEventIsValid(mutation)).toBe(false)
      expect(validateAnalyticsEvent(mutation)).toBe(false)
    }
  })
})
