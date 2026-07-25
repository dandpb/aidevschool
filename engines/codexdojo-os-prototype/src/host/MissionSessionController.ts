import type { MissionDefinition, MissionStage } from '../domain'
import {
  type EngineToHostMessage,
  type HostToEngineMessage,
  type ProtocolAckMessage,
  createEnvelope,
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
  readonly evidence: 'not-submitted' | 'pending'
  readonly error?: string
}

export type MissionSessionControllerInput = {
  readonly frame: HTMLIFrameElement
  readonly frameUrl: string
  readonly mission: MissionDefinition
  readonly onState: (snapshot: MissionSessionSnapshot) => void
  readonly onEvidence: (record: Readonly<Record<string, unknown>>) => void
}

function uniqueId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}

export class MissionSessionController {
  readonly hostSessionId = uniqueId('host')
  readonly missionRunId = uniqueId('run')
  private revision = -1
  private launchMessageId: string | null = null
  private timeout: number | undefined
  private closed = false
  private snapshot: MissionSessionSnapshot = {
    phase: 'handshaking',
    stage: 'understand',
    progress: 0,
    evidence: 'not-submitted',
  }

  constructor(private readonly input: MissionSessionControllerInput) {}

  start(): void {
    if (this.closed) return
    window.addEventListener('message', this.onMessage)
    this.timeout = window.setTimeout(() => {
      this.update({ ...this.snapshot, phase: 'failed', error: 'A missão demorou para responder.' })
    }, HANDSHAKE_TIMEOUT_MS)
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
    this.input.onState(this.snapshot)
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    window.removeEventListener('message', this.onMessage)
    window.clearTimeout(this.timeout)
    this.update({ ...this.snapshot, phase: 'closed' })
  }

  private update(snapshot: MissionSessionSnapshot): void {
    this.snapshot = snapshot
    this.input.onState(snapshot)
  }

  private send(message: HostToEngineMessage): void {
    const target = this.input.frame.contentWindow
    if (target === null) {
      this.update({ ...this.snapshot, phase: 'failed', error: 'O frame da missão não está disponível.' })
      return
    }
    target.postMessage(message, new URL(this.input.frameUrl).origin)
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
      origin: new URL(this.input.frameUrl).origin,
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
        if (!message.payload.capabilities.includes('mission-state') || !message.payload.capabilities.includes('evidence')) {
          this.update({ ...this.snapshot, phase: 'failed', error: 'O motor não oferece o contrato da missão.' })
          return
        }
        window.clearTimeout(this.timeout)
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
            },
          }),
        )
        return
      }
      case 'protocol.ack':
        if (message.payload.acknowledgedMessageId !== this.launchMessageId) return
        if (!message.payload.accepted) {
          this.update({ ...this.snapshot, phase: 'failed', error: 'O motor recusou a missão.' })
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
        this.input.onEvidence(message.payload.record)
        this.update({ ...this.snapshot, evidence: 'pending' })
        this.acknowledge(message.messageId)
        return
    }
  }
}
