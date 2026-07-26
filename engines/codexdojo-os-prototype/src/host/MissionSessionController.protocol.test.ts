import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mission,
  resetMissionSessionTestDom,
  setupController,
  voxelMission,
} from './missionSessionTestKit'

afterEach(resetMissionSessionTestDom)

describe('MissionSessionController protocol', () => {
  it.each([mission, voxelMission])(
    'uses the same correlated contract for $runtime.engineId',
    async (selectedMission) => {
      const { controller, dispatch, envelope, onEvidence, onState, origin, postMessage } =
        setupController(selectedMission)
      controller.start()

      dispatch(
        envelope('engine.ready', {
          engineVersion: '0.1.0',
          contentVersion: selectedMission.runtime.contentVersion,
          capabilities: ['mission-state', 'evidence'],
        }),
      )

      expect(postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'mission.launch',
          engineId: selectedMission.runtime.engineId,
          payload: {
            missionId: selectedMission.id,
            missionVersion: selectedMission.version,
            mode: 'initial',
            locale: 'pt-BR',
            reducedMotion: false,
            rendererPreference: 'auto',
          },
        }),
        origin,
      )

      dispatch(
        envelope('mission.state', {
          revision: 1,
          status: 'completed',
          stage: 'apply',
          progress: 1,
        }),
      )
      dispatch(
        envelope('evidence.submitted', {
          schemaId: selectedMission.evidence.schema,
          schemaVersion: selectedMission.evidence.version,
          subject: { missionId: selectedMission.id, unitId: selectedMission.unitId },
          record: {},
        }),
      )
      await Promise.resolve()

      expect(onState).toHaveBeenCalledWith(expect.objectContaining({ phase: 'completed' }))
      expect(onEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          engineId: selectedMission.runtime.engineId,
          missionRunId: controller.missionRunId,
          schemaId: selectedMission.evidence.schema,
        }),
      )
      controller.close()
    },
  )

  it('keeps a capability failure terminal instead of overwriting it on timeout', async () => {
    vi.useFakeTimers()
    const { controller, dispatch, envelope, onState, postMessage } = setupController()
    controller.start()

    dispatch(
      envelope('engine.ready', {
        engineVersion: '0.1.0',
        contentVersion: mission.runtime.contentVersion,
        capabilities: [],
      }),
    )
    const callsAfterFailure = postMessage.mock.calls.length
    await vi.advanceTimersByTimeAsync(12_000)

    expect(postMessage).toHaveBeenCalledTimes(callsAfterFailure)
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: 'failed',
        error: 'O motor não oferece o contrato da missão.',
      }),
    )
    controller.close()
  })
})
