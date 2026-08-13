import { afterEach, describe, expect, it } from 'vitest'
import {
  resetMissionSessionTestDom,
  setupController,
  voxelMission,
} from './missionSessionTestKit'

afterEach(resetMissionSessionTestDom)

describe('MissionSessionController renderer transitions', () => {
  it('correlates preferences, degradation, stale revisions, and retry separately', () => {
    const { controller, dispatch, envelope, onState, origin, postMessage } = setupController(
      voxelMission,
      { rendererPreference: 'accessible', reducedMotion: true },
    )
    controller.start()

    dispatch(
      envelope(
        'engine.ready',
        {
          engineVersion: '0.1.0',
          contentVersion: voxelMission.runtime.contentVersion,
          capabilities: ['mission-state', 'evidence', 'renderer-state'],
        },
        'ready-renderer',
      ),
    )
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'mission.launch',
        payload: expect.objectContaining({
          reducedMotion: true,
          rendererPreference: 'accessible',
        }),
      }),
      origin,
    )

    dispatch(
      envelope(
        'renderer.state',
        {
          revision: 2,
          requested: 'accessible',
          active: 'dom',
          status: 'degraded',
          reason: 'context-lost',
        },
        'renderer-2',
      ),
    )
    dispatch(
      envelope(
        'renderer.state',
        {
          revision: 1,
          requested: 'auto',
          active: 'webgl',
          status: 'ready',
        },
        'renderer-stale',
      ),
    )
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        renderer: expect.objectContaining({
          active: 'dom',
          status: 'degraded',
          reason: 'context-lost',
        }),
      }),
    )

    controller.retryRenderer('webgl')
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'renderer.retry',
        payload: { rendererPreference: 'webgl' },
      }),
      origin,
    )
    controller.close()
  })
})
