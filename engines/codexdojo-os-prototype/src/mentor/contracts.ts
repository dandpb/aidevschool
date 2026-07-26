import type { MissionStage, TrackId } from '../domain'

export const MENTOR_SCHEMA_VERSION = 1 as const
export const MENTOR_RESPONSE_MAX_LENGTH = 1_200

export type MentorMode = 'explain' | 'question' | 'hint'
export type MentorOutcome = 'answered' | 'attempt-required' | 'quota-exhausted' | 'unavailable'
export type MentorPedagogicalMode = 'non-technical' | 'developer'
export type MentorStapStage = 'checking' | 'correcting' | 'complementing' | 'segmenting'
export type MentorTurnRole = 'learner' | 'mentor'

export type MentorTurn = {
  readonly role: MentorTurnRole
  readonly content: string
}

export type MentorRequestV1 = {
  readonly schemaVersion: 1
  readonly requestId: string
  readonly mode: MentorMode
  readonly mission: {
    readonly id: string
    readonly trackId: TrackId
    readonly objective: string
    readonly concepts: readonly string[]
    readonly currentStage: MissionStage
  }
  readonly learning: {
    readonly pedagogicalMode: MentorPedagogicalMode
    readonly dreyfus: 'novice' | 'advanced_beginner' | 'competent' | 'proficient' | 'expert'
    readonly bloom: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
    readonly stapStage: MentorStapStage
    readonly stalls: number
    readonly hintQuota: {
      readonly used: number
      readonly limit: number
    }
  }
  readonly interaction: {
    readonly question: string
    readonly declaredConfusion: string
    readonly attemptExcerpt?: string
    readonly recentTurns: readonly MentorTurn[]
  }
  readonly capabilities: readonly []
  readonly retention: 'none'
}

export type MentorResponseV1 = {
  readonly schemaVersion: 1
  readonly requestId: string
  readonly outcome: MentorOutcome
  readonly response: string
  readonly pedagogy: {
    readonly stageBefore: MentorStapStage
    readonly stageAfter: MentorStapStage
    readonly solutionWithheld: true
  }
  readonly authority: {
    readonly canonicalStateWritten: false
    readonly evidenceCreated: false
    readonly masteryEvaluated: false
  }
}

const REQUEST_KEYS = [
  'schemaVersion',
  'requestId',
  'mode',
  'mission',
  'learning',
  'interaction',
  'capabilities',
  'retention',
] as const
const RESPONSE_KEYS = ['schemaVersion', 'requestId', 'outcome', 'response', 'pedagogy', 'authority'] as const
const STAP_STAGES: readonly MentorStapStage[] = ['checking', 'correcting', 'complementing', 'segmenting']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isStapStage(value: unknown): value is MentorStapStage {
  return typeof value === 'string' && STAP_STAGES.includes(value as MentorStapStage)
}

export function isMentorRequestV1(value: unknown): value is MentorRequestV1 {
  if (!isRecord(value) || !hasExactKeys(value, REQUEST_KEYS)) return false
  if (value.schemaVersion !== MENTOR_SCHEMA_VERSION || !isNonEmptyString(value.requestId, 100)) return false
  if (value.mode !== 'explain' && value.mode !== 'question' && value.mode !== 'hint') return false
  if (value.retention !== 'none' || !Array.isArray(value.capabilities) || value.capabilities.length !== 0) return false
  if (!isRecord(value.mission) || !hasExactKeys(value.mission, ['id', 'trackId', 'objective', 'concepts', 'currentStage'])) return false
  if (!isNonEmptyString(value.mission.id, 120) || !isNonEmptyString(value.mission.objective, 600)) return false
  if (value.mission.trackId !== 'ai-pratica' && value.mission.trackId !== 'dev') return false
  if (!['understand', 'respond', 'apply'].includes(String(value.mission.currentStage))) return false
  if (!Array.isArray(value.mission.concepts) || value.mission.concepts.length > 6) return false
  if (!value.mission.concepts.every((concept) => isNonEmptyString(concept, 120))) return false
  if (!isRecord(value.learning) || !hasExactKeys(value.learning, ['pedagogicalMode', 'dreyfus', 'bloom', 'stapStage', 'stalls', 'hintQuota'])) return false
  if (value.learning.pedagogicalMode !== 'non-technical' && value.learning.pedagogicalMode !== 'developer') return false
  if (!['novice', 'advanced_beginner', 'competent', 'proficient', 'expert'].includes(String(value.learning.dreyfus))) return false
  if (!['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].includes(String(value.learning.bloom))) return false
  if (!isStapStage(value.learning.stapStage)) return false
  if (!Number.isInteger(value.learning.stalls) || Number(value.learning.stalls) < 0 || Number(value.learning.stalls) > 20) return false
  if (!isRecord(value.learning.hintQuota) || !hasExactKeys(value.learning.hintQuota, ['used', 'limit'])) return false
  if (!Number.isInteger(value.learning.hintQuota.used) || !Number.isInteger(value.learning.hintQuota.limit)) return false
  if (Number(value.learning.hintQuota.used) < 0 || Number(value.learning.hintQuota.limit) < 1) return false
  if (!isRecord(value.interaction)) return false
  const interactionKeys = Object.keys(value.interaction)
  if (!interactionKeys.every((key) => ['question', 'declaredConfusion', 'attemptExcerpt', 'recentTurns'].includes(key))) return false
  if (!interactionKeys.includes('question') || !interactionKeys.includes('declaredConfusion') || !interactionKeys.includes('recentTurns')) return false
  if (!isNonEmptyString(value.interaction.question, 500) || typeof value.interaction.declaredConfusion !== 'string' || value.interaction.declaredConfusion.length > 300) return false
  if (value.interaction.attemptExcerpt !== undefined && !isNonEmptyString(value.interaction.attemptExcerpt, 1_000)) return false
  if (!Array.isArray(value.interaction.recentTurns) || value.interaction.recentTurns.length > 6) return false
  return value.interaction.recentTurns.every((turn) => (
    isRecord(turn)
    && hasExactKeys(turn, ['role', 'content'])
    && (turn.role === 'learner' || turn.role === 'mentor')
    && isNonEmptyString(turn.content, 400)
  ))
}

export function decodeMentorResponse(raw: unknown, requestId: string): MentorResponseV1 {
  if (!isRecord(raw) || !hasExactKeys(raw, RESPONSE_KEYS)) throw new Error('mentor-response-schema')
  if (raw.schemaVersion !== MENTOR_SCHEMA_VERSION || raw.requestId !== requestId) throw new Error('mentor-response-correlation')
  if (!['answered', 'attempt-required', 'quota-exhausted', 'unavailable'].includes(String(raw.outcome))) throw new Error('mentor-response-outcome')
  if (!isNonEmptyString(raw.response, MENTOR_RESPONSE_MAX_LENGTH)) throw new Error('mentor-response-text')
  if (!isRecord(raw.pedagogy) || !hasExactKeys(raw.pedagogy, ['stageBefore', 'stageAfter', 'solutionWithheld'])) throw new Error('mentor-response-pedagogy')
  if (!isStapStage(raw.pedagogy.stageBefore) || !isStapStage(raw.pedagogy.stageAfter) || raw.pedagogy.solutionWithheld !== true) throw new Error('mentor-response-pedagogy')
  if (!isRecord(raw.authority) || !hasExactKeys(raw.authority, ['canonicalStateWritten', 'evidenceCreated', 'masteryEvaluated'])) throw new Error('mentor-response-authority')
  if (raw.authority.canonicalStateWritten !== false || raw.authority.evidenceCreated !== false || raw.authority.masteryEvaluated !== false) throw new Error('mentor-response-authority')
  return raw as MentorResponseV1
}

export const NO_MENTOR_AUTHORITY: MentorResponseV1['authority'] = {
  canonicalStateWritten: false,
  evidenceCreated: false,
  masteryEvaluated: false,
}
