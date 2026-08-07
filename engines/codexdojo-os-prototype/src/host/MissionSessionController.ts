import type { MissionDefinition } from '../domain'
import type { RendererPreference } from '../rendering/domain'
import type { EvidenceSubmission } from '../verification/ports'
import {
  closeMissionSession,
  createMissionTransitionState,
  failMissionSession,
  type MissionSessionSnapshot,
  type MissionTransition,
  type MissionTransitionEffect,
  type MissionTransitionState,
  reduceMissionMessage,
  requestRendererRetry,
} from './missionSessionTransitions'
import {
  createEnvelope,
  type EngineToHostMessage,
  type HostToEngineMessage,
  type MissionEventMessage,
  type ProtocolAckMessage,
} from './protocol'
import { decodeEngineMessage } from './validation'

const HANDSHAKE_TIMEOUT_MS = 10_000

export type { MissionSessionPhase, MissionSessionSnapshot } from './missionSessionTransitions'

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
  private timeout: number | undefined
  private helloInterval: number | undefined
  private started = false
  private closed = false
  private state: MissionTransitionState
  private readonly frameOrigin: string

  constructor(private readonly input: MissionSessionControllerInput) {
    this.frameOrigin = new URL(input.frameUrl).origin
    this.state = createMissionTransitionState(input.rendererPreference ?? 'auto')
  }

  start(): void {
    if (this.closed || this.started) return
    this.started = true
    window.addEventListener('message', this.onMessage)
    this.timeout = window.setTimeout(() => {
      this.fail('A missão demorou para responder.')
    }, HANDSHAKE_TIMEOUT_MS)
    this.helloInterval = window.setInterval(() => {
      if (this.state.snapshot.phase === 'handshaking') this.sendHello()
    }, 500)
    this.sendHello()
    this.input.onState(this.state.snapshot)
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
    this.state = closeMissionSession(this.state)
    this.input.onState(this.state.snapshot)
  }

  retryRenderer(rendererPreference: RendererPreference = 'webgl'): void {
    if (this.closed || this.state.snapshot.phase === 'handshaking') return
    this.state = requestRendererRetry(this.state, rendererPreference)
    this.input.onState(this.state.snapshot)
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
    this.applyTransition(failMissionSession(this.state, error))
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
    this.applyTransition(
      reduceMissionMessage(this.state, message, {
        mission: this.input.mission,
        nextMessageId: () => uniqueId('message'),
      }),
    )
  }

  private applyTransition(transition: MissionTransition): void {
    this.state = transition.state
    if (transition.stopHandshake) this.stopHandshake()
    if (transition.notifyState) this.input.onState(this.state.snapshot)
    this.applyEffect(transition.effect)
  }

  private applyEffect(effect: MissionTransitionEffect): void {
    switch (effect.kind) {
      case 'none':
        return
      case 'launch':
        this.send(
          createEnvelope({
            type: 'mission.launch',
            messageId: effect.messageId,
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
      case 'acknowledge':
        this.acknowledge(effect.messageId, effect.accepted, effect.code)
        return
      case 'mission-event':
        try {
          this.input.onMissionEvent?.(effect.delivery)
        } catch {
          return
        }
        return
      case 'evidence':
        void this.input.onEvidence(effect.submission).then(
          (result) => {
            if (!this.closed) this.acknowledge(effect.messageId, result.accepted, result.code)
          },
          () => {
            if (!this.closed) {
              this.acknowledge(effect.messageId, false, 'evidence-intake-failed')
            }
          },
        )
        return
    }
  }
}
