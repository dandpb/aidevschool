import type { MissionDefinition, MissionStage } from '../domain'
import {
  createInitialRendererState,
  type RendererPreference,
  rendererReducer,
  type RendererState,
} from '../rendering/domain'
import type { EvidenceSubmission } from '../verification/ports'
import type { EngineToHostMessage, MissionEventMessage } from './protocol'

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

export type MissionTransitionState = {
  readonly revision: number
  readonly eventSequence: number
  readonly rendererRevision: number
  readonly engineVersion: string | null
  readonly contentVersion: string | null
  readonly acceptsMissionEvents: boolean
  readonly launchMessageId: string | null
  readonly snapshot: MissionSessionSnapshot
}

type MissionEventDelivery = {
  readonly event: MissionEventMessage['payload']
  readonly missionRunId: string
  readonly engineVersion: string
  readonly contentVersion: string
}

export type MissionTransitionEffect =
  | { readonly kind: 'none' }
  | { readonly kind: 'launch'; readonly messageId: string }
  | {
      readonly kind: 'acknowledge'
      readonly messageId: string
      readonly accepted: boolean
      readonly code?: string
    }
  | { readonly kind: 'mission-event'; readonly delivery: MissionEventDelivery }
  | {
      readonly kind: 'evidence'
      readonly messageId: string
      readonly submission: EvidenceSubmission
    }

export type MissionTransition = {
  readonly state: MissionTransitionState
  readonly effect: MissionTransitionEffect
  readonly notifyState: boolean
  readonly stopHandshake: boolean
}

export type MissionTransitionInput = {
  readonly mission: MissionDefinition
  /** Lazy: only the engine.ready branch mints an id, once per session. */
  readonly nextMessageId: () => string
}

const NO_EFFECT = { kind: 'none' } as const

export function createMissionTransitionState(
  rendererPreference: RendererPreference,
): MissionTransitionState {
  return {
    revision: -1,
    eventSequence: 0,
    rendererRevision: 0,
    engineVersion: null,
    contentVersion: null,
    acceptsMissionEvents: false,
    launchMessageId: null,
    snapshot: {
      phase: 'handshaking',
      stage: 'understand',
      progress: 0,
      renderer: createInitialRendererState(rendererPreference),
    },
  }
}

export function failMissionSession(
  state: MissionTransitionState,
  error: string,
): MissionTransition {
  return {
    state: { ...state, snapshot: { ...state.snapshot, phase: 'failed', error } },
    effect: NO_EFFECT,
    notifyState: true,
    stopHandshake: true,
  }
}

export function closeMissionSession(state: MissionTransitionState): MissionTransitionState {
  return { ...state, snapshot: { ...state.snapshot, phase: 'closed' } }
}

export function reduceMissionMessage(
  state: MissionTransitionState,
  message: EngineToHostMessage,
  input: MissionTransitionInput,
): MissionTransition {
  switch (message.type) {
    case 'engine.ready': {
      if (state.snapshot.phase !== 'handshaking') return unchanged(state)
      if (
        !message.payload.capabilities.includes('mission-state') ||
        !message.payload.capabilities.includes('evidence')
      ) {
        return failMissionSession(state, 'O motor não oferece o contrato da missão.')
      }
      if (message.payload.contentVersion !== input.mission.runtime.contentVersion) {
        return failMissionSession(state, 'A versão de conteúdo do motor não corresponde à missão.')
      }
      const launchMessageId = input.nextMessageId()
      const nextState = {
        ...state,
        engineVersion: message.payload.engineVersion,
        contentVersion: message.payload.contentVersion,
        acceptsMissionEvents: message.payload.capabilities.includes('mission-events'),
        launchMessageId,
        snapshot: { ...state.snapshot, phase: 'launching' as const },
      }
      return transition(nextState, { kind: 'launch', messageId: launchMessageId }, true, true)
    }
    case 'protocol.ack':
      if (message.payload.acknowledgedMessageId !== state.launchMessageId) return unchanged(state)
      return message.payload.accepted
        ? unchanged(state)
        : failMissionSession(state, 'O motor recusou a missão.')
    case 'mission.state':
      if (message.payload.revision <= state.revision) return unchanged(state)
      return transition(
        {
          ...state,
          revision: message.payload.revision,
          snapshot: {
            ...state.snapshot,
            phase: message.payload.status,
            stage: message.payload.stage,
            progress: message.payload.progress,
            ...(message.payload.nextMissionId === undefined
              ? {}
              : { nextMissionId: message.payload.nextMissionId }),
          },
        },
        NO_EFFECT,
        true,
      )
    case 'mission.event':
      if (
        !state.acceptsMissionEvents ||
        state.engineVersion === null ||
        state.contentVersion === null ||
        message.payload.sequence <= state.eventSequence
      ) {
        return unchanged(state)
      }
      return transition(
        { ...state, eventSequence: message.payload.sequence },
        {
          kind: 'mission-event',
          delivery: {
            event: message.payload,
            missionRunId: message.missionRunId,
            engineVersion: state.engineVersion,
            contentVersion: state.contentVersion,
          },
        },
      )
    case 'renderer.state':
      if (message.payload.revision <= state.rendererRevision) return unchanged(state)
      return transition(
        {
          ...state,
          rendererRevision: message.payload.revision,
          snapshot: {
            ...state.snapshot,
            renderer: {
              requested: message.payload.requested,
              active: message.payload.active,
              status: message.payload.status,
              ...(message.payload.reason === undefined ? {} : { reason: message.payload.reason }),
              retryCount: state.snapshot.renderer.retryCount,
            },
          },
        },
        NO_EFFECT,
        true,
      )
    case 'evidence.submitted':
      if (
        message.payload.subject.missionId !== input.mission.id ||
        message.payload.subject.unitId !== input.mission.unitId
      ) {
        return transition(state, {
          kind: 'acknowledge',
          messageId: message.messageId,
          accepted: false,
          code: 'subject-mismatch',
        })
      }
      return transition(state, {
        kind: 'evidence',
        messageId: message.messageId,
        submission: {
          evidenceId: message.messageId,
          schemaId: message.payload.schemaId,
          schemaVersion: message.payload.schemaVersion,
          engineId: message.engineId,
          missionRunId: message.missionRunId,
          subject: message.payload.subject,
          record: message.payload.record,
        },
      })
  }
}

export function requestRendererRetry(
  state: MissionTransitionState,
  requested: RendererPreference,
): MissionTransitionState {
  return {
    ...state,
    snapshot: {
      ...state.snapshot,
      renderer: rendererReducer(state.snapshot.renderer, {
        type: 'RETRY_REQUESTED',
        requested,
      }),
    },
  }
}

function unchanged(state: MissionTransitionState): MissionTransition {
  return transition(state, NO_EFFECT)
}

function transition(
  state: MissionTransitionState,
  effect: MissionTransitionEffect,
  notifyState = false,
  stopHandshake = false,
): MissionTransition {
  return { state, effect, notifyState, stopHandshake }
}
