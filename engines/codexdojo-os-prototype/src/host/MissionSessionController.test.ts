import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MissionDefinition } from '../domain'
import { MissionSessionController } from './MissionSessionController'

const mission: MissionDefinition = {
  id: 'l02',
  version: 3,
  trackId: 'ai-pratica',
  unitId: 'ai-literacy:l02',
  projectId: '00_ai_in_practice',
  title: 'IA não é uma fonte de verdade',
  objective: 'Verificar antes de usar.',
  estimatedMinutes: 4,
  prerequisites: [],
  stages: ['understand', 'respond', 'apply'],
  runtime: {
    engineId: 'literacyDojo',
    entrypoint: 'http://127.0.0.1:5178',
    environmentKey: 'VITE_LITERACYDOJO_URL',
    protocolVersion: '1.0',
  },
  evidence: { schema: 'literacy-evidence', version: 1, verifierRequired: true },
  fallback: { kind: 'dom', summary: 'Resumo.' },
}

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

function setup() {
  const frame = document.createElement('iframe')
  frame.src = mission.runtime.entrypoint
  document.body.append(frame)
  const target = frame.contentWindow
  if (target === null) throw new Error('Expected iframe window')
  const postMessage = vi.spyOn(target, 'postMessage').mockImplementation(() => undefined)
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
  return { controller, onState, postMessage, target }
}

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
    const { controller, onState, postMessage } = setup()

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

  it('keeps a capability failure terminal instead of overwriting it on timeout', async () => {
    vi.useFakeTimers()
    const { controller, onState, postMessage, target } = setup()
    controller.start()

    window.dispatchEvent(
      new MessageEvent('message', {
        source: target,
        origin: new URL(mission.runtime.entrypoint).origin,
        data: {
          protocol: 'aidevschool.host-engine',
          version: '1.0',
          type: 'engine.ready',
          messageId: 'ready-1',
          hostSessionId: controller.hostSessionId,
          missionRunId: controller.missionRunId,
          engineId: 'literacyDojo',
          sentAt: '2026-07-25T12:00:00.000Z',
          payload: {
            engineVersion: '0.1.0',
            contentVersion: 'test.1',
            capabilities: [],
          },
        },
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
