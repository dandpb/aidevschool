import type { MissionStage } from '../domain'
import type {
  ActiveRenderer,
  RendererFailureReason,
  RendererPreference,
  RendererStatus,
} from '../rendering/domain'

export const HOST_ENGINE_PROTOCOL = 'aidevschool.host-engine' as const
export const HOST_ENGINE_PROTOCOL_VERSION = '1.0' as const

export type MissionEngineId = 'literacyDojo' | 'voxelDojo'
export type MissionRunStatus = 'running' | 'completed' | 'failed'
export type EngineCapability =
  | 'mission-state'
  | 'evidence'
  | 'mission-events'
  | 'renderer-state'
export type EngineMissionEventName =
  | 'mission.started'
  | 'mission.completed'
  | 'structured_attempt.submitted'
  | 'structured_attempt.passed'
  | 'retry.requested'
  | 'review.started'

export type ProtocolEnvelope<TType extends string, TPayload> = {
  readonly protocol: typeof HOST_ENGINE_PROTOCOL
  readonly version: typeof HOST_ENGINE_PROTOCOL_VERSION
  readonly type: TType
  readonly messageId: string
  readonly hostSessionId: string
  readonly missionRunId: string
  readonly engineId: MissionEngineId
  readonly sentAt: string
  readonly payload: TPayload
}

export type HostHelloMessage = ProtocolEnvelope<
  'host.hello',
  { readonly missionId: string; readonly protocolVersion: typeof HOST_ENGINE_PROTOCOL_VERSION }
>

export type MissionLaunchMessage = ProtocolEnvelope<
  'mission.launch',
  {
    readonly missionId: string
    readonly missionVersion: number
    readonly mode: 'initial'
    readonly locale: 'pt-BR'
    readonly reducedMotion: boolean
    readonly rendererPreference: RendererPreference
  }
>

export type EngineReadyMessage = ProtocolEnvelope<
  'engine.ready',
  {
    readonly engineVersion: string
    readonly contentVersion: string
    readonly capabilities: readonly EngineCapability[]
  }
>

export type MissionStateMessage = ProtocolEnvelope<
  'mission.state',
  {
    readonly revision: number
    readonly status: MissionRunStatus
    readonly stage: MissionStage
    readonly progress: number
    readonly nextMissionId?: string
  }
>

export type EvidenceSubmittedMessage = ProtocolEnvelope<
  'evidence.submitted',
  {
    readonly schemaId: 'literacy-evidence' | 'teaching-game-evidence'
    readonly schemaVersion: 1
    readonly subject: { readonly missionId: string; readonly unitId: string }
    readonly record: Readonly<Record<string, unknown>>
  }
>

export type MissionEventMessage = ProtocolEnvelope<
  'mission.event',
  {
    readonly sequence: number
    readonly name: EngineMissionEventName
    readonly dimensions?: Readonly<Record<string, string | number | boolean>>
  }
>

export type RendererStateMessage = ProtocolEnvelope<
  'renderer.state',
  {
    readonly revision: number
    readonly requested: RendererPreference
    readonly active: ActiveRenderer
    readonly status: RendererStatus
    readonly reason?: RendererFailureReason
  }
>

export type RendererRetryMessage = ProtocolEnvelope<
  'renderer.retry',
  { readonly rendererPreference: RendererPreference }
>

export type ProtocolAckMessage = ProtocolEnvelope<
  'protocol.ack',
  {
    readonly acknowledgedMessageId: string
    readonly accepted: boolean
    readonly code?: string
  }
>

export type HostToEngineMessage =
  | HostHelloMessage
  | MissionLaunchMessage
  | RendererRetryMessage
  | ProtocolAckMessage
export type EngineToHostMessage =
  | EngineReadyMessage
  | MissionStateMessage
  | MissionEventMessage
  | RendererStateMessage
  | EvidenceSubmittedMessage
  | ProtocolAckMessage

export function createEnvelope<TType extends HostToEngineMessage['type'], TPayload>(input: {
  readonly type: TType
  readonly payload: TPayload
  readonly messageId: string
  readonly hostSessionId: string
  readonly missionRunId: string
  readonly engineId: MissionEngineId
}): ProtocolEnvelope<TType, TPayload> {
  return {
    protocol: HOST_ENGINE_PROTOCOL,
    version: HOST_ENGINE_PROTOCOL_VERSION,
    type: input.type,
    messageId: input.messageId,
    hostSessionId: input.hostSessionId,
    missionRunId: input.missionRunId,
    engineId: input.engineId,
    sentAt: new Date().toISOString(),
    payload: input.payload,
  }
}
