import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyticsEventIsValid, type AnalyticsEvent } from '../analytics/events'
import {
  mission,
  resetMissionSessionTestDom,
  setupController,
} from './missionSessionTestKit'

// F2 `2026-09-10-entry-brief-instrumentation` (prova 1 do plan §3): missão
// hospedada emitindo `mission.brief_viewed` + `activity.presented` — o
// whitelist do receptor aceita os 2 nomes novos (e rejeita fora do
// vocabulário) e o controller entrega ao host, que reemite como evento OS v1
// válido (o encaminhamento do MissionShell é genérico sobre `name`).

describe('hosted mission exposure events (F2)', () => {
  afterEach(() => {
    resetMissionSessionTestDom()
    vi.restoreAllMocks()
  })

  function readyController() {
    const onMissionEvent = vi.fn()
    const kit = setupController(mission, { onMissionEvent })
    kit.controller.start()
    kit.dispatch(
      kit.envelope('engine.ready', {
        engineVersion: '0.1.0',
        contentVersion: mission.runtime.contentVersion,
        capabilities: ['mission-state', 'evidence', 'mission-events'],
      }),
    )
    return { ...kit, onMissionEvent }
  }

  it('aceita mission.brief_viewed (sem dimensões próprias) e entrega ao host', () => {
    const { controller, dispatch, envelope, onMissionEvent } = readyController()
    dispatch(
      envelope('mission.event', { sequence: 1, name: 'mission.brief_viewed', dimensions: {} }),
    )
    expect(onMissionEvent).toHaveBeenCalledTimes(1)
    expect(onMissionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ name: 'mission.brief_viewed', sequence: 1 }),
        missionRunId: controller.missionRunId,
      }),
    )
    controller.close()
  })

  it('aceita activity.presented com activityType do vocabulário fechado', () => {
    const { controller, dispatch, envelope, onMissionEvent } = readyController()
    dispatch(
      envelope('mission.event', {
        sequence: 2,
        name: 'activity.presented',
        dimensions: { activityType: 'output_comparison' },
      }),
    )
    expect(onMissionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          name: 'activity.presented',
          dimensions: { activityType: 'output_comparison' },
        }),
      }),
    )
    controller.close()
  })

  it('rejeita nome fora do vocabulário do mission-event (whitelist fechada)', () => {
    const { controller, dispatch, envelope, onMissionEvent } = readyController()
    dispatch(
      envelope('mission.event', { sequence: 1, name: 'mission.brief_seen', dimensions: {} }),
    )
    dispatch(
      envelope('mission.event', { sequence: 2, name: 'activity.scrolled', dimensions: {} }),
    )
    expect(onMissionEvent).not.toHaveBeenCalled()
    controller.close()
  })

  it('a reemissão OS v1 (como o MissionShell constrói) passa o validador do envelope', () => {
    const { controller, dispatch, envelope, onMissionEvent } = readyController()
    dispatch(
      envelope('mission.event', { sequence: 1, name: 'mission.brief_viewed', dimensions: {} }),
    )
    dispatch(
      envelope('mission.event', {
        sequence: 2,
        name: 'activity.presented',
        dimensions: { activityType: 'choice' },
      }),
    )
    expect(onMissionEvent).toHaveBeenCalledTimes(2)
    // O MissionShell reemite {name, dimensions, context{...analyticsContext,
    // missionRunId, engineId, engineVersion, contentVersion}}; o contexto
    // completo precisa caber no vocabulário OS v1.
    for (const call of onMissionEvent.mock.calls) {
      const delivery = call[0] as {
        event: { name: string; dimensions?: Record<string, string | number | boolean> }
      }
      const osEvent: AnalyticsEvent = {
        schemaVersion: 1,
        eventId: `event-${delivery.event.name}`,
        name: delivery.event.name as never,
        occurredAt: '2026-09-10T12:00:00.000Z',
        sequence: 1,
        dimensions: {
          installationId: 'installation-1',
          sessionId: 'session-1',
          trackId: mission.trackId,
          missionId: mission.id,
          missionRunId: controller.missionRunId,
          engineId: mission.runtime.engineId,
          engineVersion: '0.1.0',
          contentVersion: mission.runtime.contentVersion,
          ...(delivery.event.dimensions ?? {}),
        },
      }
      expect(analyticsEventIsValid(osEvent), delivery.event.name).toBe(true)
    }
    controller.close()
  })
})
