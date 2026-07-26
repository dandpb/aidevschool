import { vi } from 'vitest'
import type { MissionDefinition } from '../domain'
import type { RendererPreference } from '../rendering/domain'
import type { EvidenceSubmission } from '../verification/ports'
import {
  MissionSessionController,
  type MissionSessionControllerInput,
} from './MissionSessionController'

export const mission: MissionDefinition = {
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

export const voxelMission: MissionDefinition = {
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

type ControllerOptions = {
  readonly rendererPreference?: RendererPreference
  readonly reducedMotion?: boolean
  readonly onEvidence?: MissionSessionControllerInput['onEvidence']
  readonly onMissionEvent?: MissionSessionControllerInput['onMissionEvent']
}

export function setupController(
  selectedMission: MissionDefinition = mission,
  options: ControllerOptions = {},
) {
  const frame = document.createElement('iframe')
  frame.src = selectedMission.runtime.entrypoint
  document.body.append(frame)
  const target = frame.contentWindow
  if (target === null) throw new Error('Expected iframe window')
  const postMessage = vi.spyOn(target, 'postMessage').mockImplementation(() => undefined)
  const onState = vi.fn()
  const onEvidence =
    options.onEvidence ?? vi.fn(async (_submission: EvidenceSubmission) => ({ accepted: true }))
  const controller = new MissionSessionController({
    frame,
    frameUrl: selectedMission.runtime.entrypoint,
    mission: selectedMission,
    onState,
    onEvidence,
    ...(options.rendererPreference === undefined
      ? {}
      : { rendererPreference: options.rendererPreference }),
    ...(options.reducedMotion === undefined ? {} : { reducedMotion: options.reducedMotion }),
    ...(options.onMissionEvent === undefined ? {} : { onMissionEvent: options.onMissionEvent }),
  })
  const origin = new URL(selectedMission.runtime.entrypoint).origin
  const envelope = (
    type: string,
    payload: Readonly<Record<string, unknown>>,
    messageId = `${type}-1`,
  ) => ({
    protocol: 'aidevschool.host-engine',
    version: '1.0',
    type,
    messageId,
    hostSessionId: controller.hostSessionId,
    missionRunId: controller.missionRunId,
    engineId: selectedMission.runtime.engineId,
    sentAt: '2026-07-25T12:00:00.000Z',
    payload,
  })
  const dispatch = (data: unknown): void => {
    window.dispatchEvent(new MessageEvent('message', { source: target, origin, data }))
  }
  return {
    controller,
    dispatch,
    envelope,
    onEvidence,
    onState,
    origin,
    postMessage,
    target,
  }
}

export function resetMissionSessionTestDom(): void {
  vi.useRealTimers()
  document.body.replaceChildren()
}
