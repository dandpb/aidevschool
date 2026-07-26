import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionSessionController } from './MissionSessionController'
import {
  mission,
  resetMissionSessionTestDom,
  setupController,
  voxelMission,
} from './missionSessionTestKit'

afterEach(resetMissionSessionTestDom)

describe('MissionSessionController lifecycle', () => {
  it('does not start retries after failing to reach the iframe window', async () => {
    vi.useFakeTimers()
    const frame = document.createElement('iframe')
    const onState = vi.fn()
    const controller = new MissionSessionController({
      frame,
      frameUrl: mission.runtime.entrypoint,
      mission,
      onState,
      async onEvidence() {
        return { accepted: true }
      },
    })

    controller.start()
    await vi.advanceTimersByTimeAsync(12_000)

    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: 'failed',
        error: 'O frame da missão não está disponível.',
      }),
    )
    expect(onState).toHaveBeenCalledTimes(2)
    controller.close()
  })

  it('starts once and stops retrying after the handshake timeout', async () => {
    vi.useFakeTimers()
    const { controller, onState, postMessage } = setupController()

    controller.start()
    controller.start()
    expect(postMessage).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(10_000)
    const callsAfterTimeout = postMessage.mock.calls.length
    await vi.advanceTimersByTimeAsync(2_000)

    expect(postMessage).toHaveBeenCalledTimes(callsAfterTimeout)
    expect(onState).toHaveBeenLastCalledWith(
      expect.objectContaining({ phase: 'failed', error: 'A missão demorou para responder.' }),
    )
    controller.close()
  })

  it('fully disposes the previous mission before a replacement starts', () => {
    const first = setupController(mission)
    first.controller.start()
    first.controller.close()
    const callsAfterClose = first.postMessage.mock.calls.length

    first.dispatch({})
    expect(first.postMessage).toHaveBeenCalledTimes(callsAfterClose)

    const replacement = setupController(voxelMission)
    replacement.controller.start()
    expect(replacement.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'host.hello', engineId: 'voxelDojo' }),
      replacement.origin,
    )
    replacement.controller.close()
  })
})
