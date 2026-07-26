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
  chapterOrder: 2,
  prerequisites: [],
  stages: ['understand', 'respond', 'apply'],
  runtime: {
    engineId: 'literacyDojo',
    entrypoint: 'http://127.0.0.1:5178',
    environmentKey: 'VITE_LITERACYDOJO_URL',
    protocolVersion: '1.0',
    contentVersion: 'test.1',
  },
  evidence: { schema: 'literacy-evidence', version: 1, verifierRequired: true },
  fallback: { kind: 'dom', summary: 'Resumo.' },
}

const voxelMission: MissionDefinition = {
  id: 'game-02-warehouse',
  version: 1,
  trackId: 'dev',
  unitId: 'U2-key-value-store',
  projectId: '02_key_value_store',
  title: 'WAREHOUSE: Key-Value Store (in-memory)',
  objective: 'Prever a prateleira.',
  estimatedMinutes: 12,
  chapterOrder: 1,
  prerequisites: [],
  stages: ['understand', 'respond', 'apply'],
  runtime: {
    engineId: 'voxelDojo',
    entrypoint: 'http://127.0.0.1:5202',
    environmentKey: 'VITE_WAREHOUSE_URL',
    protocolVersion: '1.0',
    contentVersion: 'game-02-warehouse@0.1.0',
  },
  evidence: { schema: 'teaching-game-evidence', version: 1, verifierRequired: true },
  fallback: { kind: 'dom', summary: 'Resumo.' },
}

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

function setup(selectedMission: MissionDefinition = mission) {
  const frame = document.createElement('iframe')
  frame.src = selectedMission.runtime.entrypoint
  document.body.append(frame)
  const target = frame.contentWindow
  if (target === null) throw new Error('Expected iframe window')
  const postMessage = vi.spyOn(target, 'postMessage').mockImplementation(() => undefined)
  const onState = vi.fn()
  const onEvidence = vi.fn(async () => ({ accepted: true }))
  const controller = new MissionSessionController({
    frame,
    frameUrl: selectedMission.runtime.entrypoint,
    mission: selectedMission,
    onState,
    onEvidence,
  })
  return { controller, onEvidence, onState, postMessage, target }
}

describe('MissionSessionController lifecycle', () => {
  it.each([
    mission,
    voxelMission,
  ])('uses the same correlated contract for $runtime.engineId', async (selectedMission) => {
    const { controller, onEvidence, onState, postMessage, target } = setup(selectedMission)
    controller.start()
    const origin = new URL(selectedMission.runtime.entrypoint).origin
    const envelope = (type: string, payload: Readonly<Record<string, unknown>>) => ({
      protocol: 'aidevschool.host-engine',
      version: '1.0',
      type,
      messageId: `${type}-1`,
      hostSessionId: controller.hostSessionId,
      missionRunId: controller.missionRunId,
      engineId: selectedMission.runtime.engineId,
      sentAt: '2026-07-25T12:00:00.000Z',
      payload,
    })

    window.dispatchEvent(
      new MessageEvent('message', {
        source: target,
        origin,
        data: envelope('engine.ready', {
          engineVersion: '0.1.0',
          contentVersion: selectedMission.runtime.contentVersion,
          capabilities: ['mission-state', 'evidence'],
        }),
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

    window.dispatchEvent(
      new MessageEvent('message', {
        source: target,
        origin,
        data: envelope('mission.state', {
          revision: 1,
          status: 'completed',
          stage: 'apply',
          progress: 1,
        }),
      }),
    )
    window.dispatchEvent(
      new MessageEvent('message', {
        source: target,
        origin,
        data: envelope('evidence.submitted', {
          schemaId: selectedMission.evidence.schema,
          schemaVersion: selectedMission.evidence.version,
          subject: { missionId: selectedMission.id, unitId: selectedMission.unitId },
          record: {},
        }),
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
  })

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

  it('fully disposes the previous mission before a replacement starts', () => {
    const first = setup(mission)
    first.controller.start()
    first.controller.close()
    const callsAfterClose = first.postMessage.mock.calls.length

    window.dispatchEvent(
      new MessageEvent('message', {
        source: first.target,
        origin: new URL(mission.runtime.entrypoint).origin,
        data: {},
      }),
    )
    expect(first.postMessage).toHaveBeenCalledTimes(callsAfterClose)

    const replacement = setup(voxelMission)
    replacement.controller.start()
    expect(replacement.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'host.hello', engineId: 'voxelDojo' }),
      new URL(voxelMission.runtime.entrypoint).origin,
    )
    replacement.controller.close()
  })

  it('correlates renderer preferences, degradation, stale revisions, and retry separately', () => {
    const frame = document.createElement('iframe')
    frame.src = voxelMission.runtime.entrypoint
    document.body.append(frame)
    const target = frame.contentWindow
    if (target === null) throw new Error('Expected iframe window')
    const postMessage = vi.spyOn(target, 'postMessage').mockImplementation(() => undefined)
    const onState = vi.fn()
    const controller = new MissionSessionController({
      frame,
      frameUrl: voxelMission.runtime.entrypoint,
      mission: voxelMission,
      rendererPreference: 'accessible',
      reducedMotion: true,
      onState,
      async onEvidence() {
        return { accepted: true }
      },
    })
    const envelope = (type: string, payload: Readonly<Record<string, unknown>>, messageId: string) => ({
      protocol: 'aidevschool.host-engine',
      version: '1.0',
      type,
      messageId,
      hostSessionId: controller.hostSessionId,
      missionRunId: controller.missionRunId,
      engineId: 'voxelDojo',
      sentAt: '2026-07-25T12:00:00.000Z',
      payload,
    })
    const dispatch = (data: unknown) => window.dispatchEvent(new MessageEvent('message', {
      source: target,
      origin: new URL(voxelMission.runtime.entrypoint).origin,
      data,
    }))
    controller.start()

    dispatch(envelope('engine.ready', {
      engineVersion: '0.1.0',
      contentVersion: voxelMission.runtime.contentVersion,
      capabilities: ['mission-state', 'evidence', 'renderer-state'],
    }, 'ready-renderer'))
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'mission.launch',
        payload: expect.objectContaining({
          reducedMotion: true,
          rendererPreference: 'accessible',
        }),
      }),
      new URL(voxelMission.runtime.entrypoint).origin,
    )

    dispatch(envelope('renderer.state', {
      revision: 2,
      requested: 'accessible',
      active: 'dom',
      status: 'degraded',
      reason: 'context-lost',
    }, 'renderer-2'))
    dispatch(envelope('renderer.state', {
      revision: 1,
      requested: 'auto',
      active: 'webgl',
      status: 'ready',
    }, 'renderer-stale'))
    expect(onState).toHaveBeenLastCalledWith(expect.objectContaining({
      renderer: expect.objectContaining({
        active: 'dom',
        status: 'degraded',
        reason: 'context-lost',
      }),
    }))

    controller.retryRenderer('webgl')
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'renderer.retry',
        payload: { rendererPreference: 'webgl' },
      }),
      new URL(voxelMission.runtime.entrypoint).origin,
    )
    controller.close()
  })
})
