import type { MissionDefinition, MissionStage } from '../domain'
import {
  createInitialRendererState,
  type RendererPreference,
  rendererReducer,
  type RendererState,
} from '../rendering/domain'
import type { EvidenceSubmission } from '../verification/ports'
import {
  createEnvelope,
  type EngineToHostMessage,
  type HostToEngineMessage,
  type MissionEventMessage,
  type ProtocolAckMessage,
} from './protocol'
import { decodeEngineMessage } from './validation'

const HANDSHAKE_TIMEOUT_MS = 10_000

export type MissionSessionPhase =
  | 'handshaking'
  | 'launching'
  | 'running'
  | 'completed'
  | 'failed'
  | 'closed'

export type MissionSessionSnapshot = {
  readonly phase: MissionSessionPhase
  readonly stage: MissionStage
  readonly progress: number
  readonly error?: string
  readonly nextMissionId?: string
  readonly renderer: RendererState
}

export type MissionSessionControllerInput = {
  readonly frame: HTMLIFrameElement
  readonly frameUrl: string
  readonly mission: MissionDefinition
  readonly rendererPreference?: RendererPreference
  readonly reducedMotion?: boolean
  readonly onState: (snapshot: MissionSessionSnapshot) => void
  readonly onEvidence: (
    submission: EvidenceSubmission,
  ) => Promise<{ readonly accepted: boolean; readonly code?: string }>
  readonly onMissionEvent?: (input: {
    readonly event: MissionEventMessage['payload']
    readonly missionRunId: string
    readonly engineVersion: string
    readonly contentVersion: string
  }) => void
}

function uniqueId(prefix: string): string {
  const random =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}

export class MissionSessionController {
  readonly hostSessionId = uniqueId('host')
  readonly missionRunId = uniqueId('run')
  private revision = -1
  private eventSequence = 0
  private rendererRevision = 0
  private engineVersion: string | null = null
  private contentVersion: string | null = null
  private acceptsMissionEvents = false
  private launchMessageId: string | null = null
  private timeout: number | undefined
  private helloInterval: number | undefined
  private started = false
  private closed = false
  private snapshot: MissionSessionSnapshot
  /** Immutable for the controller's life; every message would otherwise re-parse it. */
  private readonly frameOrigin: string

  constructor(private readonly input: MissionSessionControllerInput) {
    this.frameOrigin = new URL(input.frameUrl).origin
    this.snapshot = {
      phase: 'handshaking',
      stage: 'understand',
      progress: 0,
      renderer: createInitialRendererState(input.rendererPreference ?? 'auto'),
    }
  }

  start(): void {
    if (this.closed || this.started) return
    this.started = true
    window.addEventListener('message', this.onMessage)
    this.timeout = window.setTimeout(() => {
      this.fail('A missão demorou para responder.')
    }, HANDSHAKE_TIMEOUT_MS)
    this.helloInterval = window.setInterval(() => {
      if (this.snapshot.phase === 'handshaking') this.sendHello()
    }, 500)
    this.sendHello()
    this.input.onState(this.snapshot)
  }

  private sendHello(): void {
    this.send(
      createEnvelope({
        type: 'host.hello',
        messageId: uniqueId('message'),
        hostSessionId: this.hostSessionId,
        missionRunId: this.missionRunId,
        engineId: this.input.mission.runtime.engineId,
        payload: { missionId: this.input.mission.id, protocolVersion: '1.0' },
      }),
    )
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    window.removeEventListener('message', this.onMessage)
    this.stopHandshake()
    this.update({ ...this.snapshot, phase: 'closed' })
  }

  retryRenderer(rendererPreference: RendererPreference = 'webgl'): void {
    if (this.closed || this.snapshot.phase === 'handshaking') return
    this.update({
      ...this.snapshot,
      renderer: rendererReducer(this.snapshot.renderer, {
        type: 'RETRY_REQUESTED',
        requested: rendererPreference,
      }),
    })
    this.send(
      createEnvelope({
        type: 'renderer.retry',
        messageId: uniqueId('message'),
        hostSessionId: this.hostSessionId,
        missionRunId: this.missionRunId,
        engineId: this.input.mission.runtime.engineId,
        payload: { rendererPreference },
      }),
    )
  }

  private stopHandshake(): void {
    window.clearTimeout(this.timeout)
    window.clearInterval(this.helloInterval)
  }

  private fail(error: string): void {
    this.stopHandshake()
    this.update({ ...this.snapshot, phase: 'failed', error })
  }

  private update(snapshot: MissionSessionSnapshot): void {
    this.snapshot = snapshot
    this.input.onState(snapshot)
  }

  private send(message: HostToEngineMessage): void {
    const target = this.input.frame.contentWindow
    if (target === null) {
      this.fail('O frame da missão não está disponível.')
      return
    }
    target.postMessage(message, this.frameOrigin)
  }

  private acknowledge(messageId: string, accepted = true, code?: string): void {
    const payload: ProtocolAckMessage['payload'] = {
      acknowledgedMessageId: messageId,
      accepted,
      ...(code === undefined ? {} : { code }),
    }
    this.send(
      createEnvelope({
        type: 'protocol.ack',
        messageId: uniqueId('message'),
        hostSessionId: this.hostSessionId,
        missionRunId: this.missionRunId,
        engineId: this.input.mission.runtime.engineId,
        payload,
      }),
    )
  }

  private onMessage = (event: MessageEvent<unknown>): void => {
    if (this.closed || this.input.frame.contentWindow === null) return
    const decoded = decodeEngineMessage(event, {
      sourceWindow: this.input.frame.contentWindow,
      origin: this.frameOrigin,
      hostSessionId: this.hostSessionId,
      missionRunId: this.missionRunId,
      engineId: this.input.mission.runtime.engineId,
    })
    if (!decoded.ok) return
    this.handle(decoded.message)
  }

  private handle(message: EngineToHostMessage): void {
    switch (message.type) {
      case 'engine.ready': {
        if (this.snapshot.phase !== 'handshaking') return
        if (
          !message.payload.capabilities.includes('mission-state') ||
          !message.payload.capabilities.includes('evidence')
        ) {
          this.fail('O motor não oferece o contrato da missão.')
          return
        }
        if (message.payload.contentVersion !== this.input.mission.runtime.contentVersion) {
          this.fail('A versão de conteúdo do motor não corresponde à missão.')
          return
        }
        this.engineVersion = message.payload.engineVersion
        this.contentVersion = message.payload.contentVersion
        this.acceptsMissionEvents = message.payload.capabilities.includes('mission-events')
        this.stopHandshake()
        this.launchMessageId = uniqueId('message')
        this.update({ ...this.snapshot, phase: 'launching' })
        this.send(
          createEnvelope({
            type: 'mission.launch',
            messageId: this.launchMessageId,
            hostSessionId: this.hostSessionId,
            missionRunId: this.missionRunId,
            engineId: this.input.mission.runtime.engineId,
            payload: {
              missionId: this.input.mission.id,
              missionVersion: this.input.mission.version,
              mode: 'initial' as const,
              locale: 'pt-BR' as const,
              reducedMotion: this.input.reducedMotion ?? false,
              rendererPreference: this.input.rendererPreference ?? 'auto',
            },
          }),
        )
        return
      }
      case 'protocol.ack':
        if (message.payload.acknowledgedMessageId !== this.launchMessageId) return
        if (!message.payload.accepted) {
          this.fail('O motor recusou a missão.')
        }
        return
      case 'mission.state':
        if (message.payload.revision <= this.revision) return
        this.revision = message.payload.revision
        this.update({
          ...this.snapshot,
          phase: message.payload.status,
          stage: message.payload.stage,
          progress: message.payload.progress,
          ...(message.payload.nextMissionId === undefined
            ? {}
            : { nextMissionId: message.payload.nextMissionId }),
        })
        return
      case 'mission.event':
        if (
          !this.acceptsMissionEvents ||
          this.engineVersion === null ||
          this.contentVersion === null ||
          message.payload.sequence <= this.eventSequence
        ) {
          return
        }
        this.eventSequence = message.payload.sequence
        try {
          this.input.onMissionEvent?.({
            event: message.payload,
            missionRunId: message.missionRunId,
            engineVersion: this.engineVersion,
            contentVersion: this.contentVersion,
          })
        } catch {
          // Best-effort analytics cannot alter mission state.
        }
        return
      case 'renderer.state':
        if (message.payload.revision <= this.rendererRevision) return
        this.rendererRevision = message.payload.revision
        this.update({
          ...this.snapshot,
          renderer: {
            requested: message.payload.requested,
            active: message.payload.active,
            status: message.payload.status,
            ...(message.payload.reason === undefined ? {} : { reason: message.payload.reason }),
            retryCount: this.snapshot.renderer.retryCount,
          },
        })
        return
      case 'evidence.submitted':
        if (
          message.payload.subject.missionId !== this.input.mission.id ||
          message.payload.subject.unitId !== this.input.mission.unitId
        ) {
          this.acknowledge(message.messageId, false, 'subject-mismatch')
          return
        }
        void this.input
          .onEvidence({
            schemaId: message.payload.schemaId,
            schemaVersion: message.payload.schemaVersion,
            engineId: message.engineId,
            missionRunId: message.missionRunId,
            subject: message.payload.subject,
            record: message.payload.record,
          })
          .then(
            (result) => {
              if (!this.closed) this.acknowledge(message.messageId, result.accepted, result.code)
            },
            () => {
              if (!this.closed) this.acknowledge(message.messageId, false, 'evidence-intake-failed')
            },
          )
        return
    }
  }
}
