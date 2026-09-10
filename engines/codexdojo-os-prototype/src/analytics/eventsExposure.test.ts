import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_EVENT_NAMES,
  type AnalyticsEvent,
  analyticsEventInputIsValid,
  analyticsEventIsValid,
} from './events'
// @ts-expect-error TS7016: declarations intentionally not colocated (AID-961)
import * as collectorModule from '../../../../learner/gate/netlify-functions/dojo-analytics-collector.mjs'

const { validateAnalyticsEvent } = collectorModule

// F2 `2026-09-10-entry-brief-instrumentation`: os 2 eventos de exposição
// entram no vocabulário fechado OS v1 — sem dimensões próprias para o brief,
// activityType fechado para a apresentação — e o coletor os aceita em
// paridade (P4). Retro-compat: os 12 nomes pré-F2 seguem válidos.

function exposureEvent(
  name: 'mission.brief_viewed' | 'activity.presented',
  dimensions: Record<string, string | number | boolean> = {},
): AnalyticsEvent {
  return {
    schemaVersion: 1,
    eventId: `event-${name}`,
    name,
    occurredAt: '2026-09-10T12:00:00.000Z',
    sequence: 1,
    dimensions: { installationId: 'installation-1', sessionId: 'session-1', ...dimensions },
  }
}

describe('OS vocabulary: exposure events (F2)', () => {
  it('contém exatamente os 12 nomes pré-F2 + os 2 de exposição', () => {
    expect(ANALYTICS_EVENT_NAMES).toContain('mission.brief_viewed')
    expect(ANALYTICS_EVENT_NAMES).toContain('activity.presented')
    expect(ANALYTICS_EVENT_NAMES).toHaveLength(14)
  })

  it('mission.brief_viewed é válido sem dimensões próprias (só contexto enriquecido)', () => {
    const event = exposureEvent('mission.brief_viewed', {
      trackId: 'ai-pratica',
      missionId: 'l02',
      engineId: 'literacyDojo',
    })
    expect(analyticsEventIsValid(event)).toBe(true)
    expect(validateAnalyticsEvent(event)).toBe(true)
  })

  it('activity.presented exige activityType do vocabulário fechado', () => {
    const valid = exposureEvent('activity.presented', {
      activityType: 'choice',
      engineId: 'literacyDojo',
    })
    expect(analyticsEventIsValid(valid)).toBe(true)
    expect(validateAnalyticsEvent(valid)).toBe(true)

    const outOfVocabulary = exposureEvent('activity.presented', { activityType: 'scroll' })
    expect(analyticsEventIsValid(outOfVocabulary)).toBe(false)
    expect(validateAnalyticsEvent(outOfVocabulary)).toBe(false)
  })

  it('o input de emissão também rejeita propriedades fora do vocabulário', () => {
    expect(
      analyticsEventInputIsValid({
        name: 'activity.presented',
        dimensions: { activityType: 'hover' },
      }),
    ).toBe(false)
    expect(
      analyticsEventInputIsValid({
        name: 'mission.brief_viewed',
        dimensions: { lessonId: 'l02' },
      }),
    ).toBe(false)
    expect(analyticsEventInputIsValid({ name: 'mission.brief_viewed' })).toBe(true)
  })
})
