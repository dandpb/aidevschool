import type { LearnerSnapshot, MissionDefinition, MissionStage } from '../domain'
import type { MentorMode, MentorRequestV1, MentorStapStage, MentorTurn } from './contracts'

export const MENTOR_MAX_RECENT_TURNS = 6

export type MentorContextInput = {
  readonly requestId: string
  readonly mode: MentorMode
  readonly mission: MissionDefinition
  readonly currentStage: MissionStage
  readonly question: string
  readonly declaredConfusion?: string
  readonly attemptExcerpt?: string
  readonly recentTurns?: readonly MentorTurn[]
  readonly learnerLevel: Pick<LearnerSnapshot['profile'], 'dreyfus' | 'bloom'>
  readonly stapStage: MentorStapStage
  readonly stalls: number
  readonly hintQuota: { readonly used: number; readonly limit: number }
  readonly concepts?: readonly string[]
}

function trimTo(value: string | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength)
}

function missionConcepts(input: MentorContextInput): readonly string[] {
  const declared = input.concepts?.map((concept) => trimTo(concept, 120)).filter(Boolean) ?? []
  if (declared.length > 0) return declared.slice(0, 6)
  return [trimTo(input.mission.title, 120)]
}

export function buildMentorContext(input: MentorContextInput): MentorRequestV1 {
  const attemptExcerpt = trimTo(input.attemptExcerpt, 1_000)
  return {
    schemaVersion: 1,
    requestId: trimTo(input.requestId, 100),
    mode: input.mode,
    mission: {
      id: input.mission.id,
      trackId: input.mission.trackId,
      objective: trimTo(input.mission.objective, 600),
      concepts: missionConcepts(input),
      currentStage: input.currentStage,
    },
    learning: {
      pedagogicalMode: input.mission.trackId === 'dev' ? 'developer' : 'non-technical',
      dreyfus: input.learnerLevel.dreyfus,
      bloom: input.learnerLevel.bloom,
      stapStage: input.stapStage,
      stalls: Math.max(0, Math.min(20, Math.floor(input.stalls))),
      hintQuota: {
        used: Math.max(0, Math.floor(input.hintQuota.used)),
        limit: Math.max(1, Math.floor(input.hintQuota.limit)),
      },
    },
    interaction: {
      question: trimTo(input.question, 500),
      declaredConfusion: trimTo(input.declaredConfusion, 300),
      ...(attemptExcerpt === '' ? {} : { attemptExcerpt }),
      recentTurns: (input.recentTurns ?? [])
        .slice(-MENTOR_MAX_RECENT_TURNS)
        .map((turn) => ({ role: turn.role, content: trimTo(turn.content, 400) }))
        .filter((turn) => turn.content.length > 0),
    },
    capabilities: [],
    retention: 'none',
  }
}
