import type { MissionDefinition, MissionKey, TrackId } from '../domain'

/** Lives here rather than in ./domain because domain imports from this module. */
export function missionKey(trackId: TrackId, missionId: string): MissionKey {
  return `${trackId}:${missionId}`
}

export type LocalMissionStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export type AchievementId =
  | 'first-mission'
  | 'first-practice'
  | 'ai-pratica-started'
  | 'dev-started'
  | 'three-missions'
  | 'streak-3'
  | 'streak-7'

export type LocalAchievement = {
  readonly id: AchievementId
  readonly earnedAt: string
}

export type LocalEngagementStreak = {
  readonly current: number
  readonly longest: number
  readonly lastActiveLocalDate: string | null
}

export type MissionCompletionKind = 'initial' | 'review' | 'retry'
export type MissionPracticeKind = MissionCompletionKind | 'targeted-practice'

export type MissionEngagement = {
  readonly attempts: number
  readonly attemptIds: readonly string[]
  readonly hintsRequested: number
  readonly hintRequestIds: readonly string[]
  readonly practiceCount: number
  readonly practiceCompleted: boolean
  readonly applicationCompleted: boolean
  readonly retryRecommended: boolean
  readonly lastAttemptAt: string | null
  readonly lastCompletedAt: string | null
  readonly completedReviewKeys: readonly string[]
  readonly activePracticeKind: MissionPracticeKind
  readonly activeCanonicalReviewKey: string | null
}

export type MissionAttemptInput = {
  readonly attemptId: string
  readonly passed: boolean
  readonly hintsUsed?: number
  readonly occurredAt: Date
}

export type EngagementProgress = {
  readonly missionStatusByKey: Readonly<Record<MissionKey, LocalMissionStatus>>
  readonly xp: number
  readonly dailyGoalXp: number
  readonly dailyXpByLocalDate: Readonly<Record<string, number>>
  readonly localEngagementStreak: LocalEngagementStreak
  readonly achievements: readonly LocalAchievement[]
  readonly missionEngagementByKey: Readonly<Record<MissionKey, MissionEngagement>>
  readonly rewardedActivityKeys: readonly string[]
}

export function emptyMissionEngagement(): MissionEngagement {
  return {
    attempts: 0,
    attemptIds: [],
    hintsRequested: 0,
    hintRequestIds: [],
    practiceCount: 0,
    practiceCompleted: false,
    applicationCompleted: false,
    retryRecommended: false,
    lastAttemptAt: null,
    lastCompletedAt: null,
    completedReviewKeys: [],
    activePracticeKind: 'initial',
    activeCanonicalReviewKey: null,
  }
}

export function recordMissionAttempt<T extends EngagementProgress>(
  progress: T,
  mission: MissionDefinition,
  input: MissionAttemptInput,
): T {
  const key = missionKey(mission.trackId, mission.id)
  const engagement = progress.missionEngagementByKey[key] ?? emptyMissionEngagement()
  if (engagement.attemptIds.includes(input.attemptId)) return progress
  const hintsUsed = Math.max(0, Math.floor(input.hintsUsed ?? 0))
  return {
    ...progress,
    missionEngagementByKey: {
      ...progress.missionEngagementByKey,
      [key]: {
        ...engagement,
        attempts: engagement.attempts + 1,
        attemptIds: [...engagement.attemptIds, input.attemptId],
        hintsRequested: engagement.hintsRequested + hintsUsed,
        retryRecommended: !input.passed,
        lastAttemptAt: input.occurredAt.toISOString(),
      },
    },
  }
}

export function recordHintRequest<T extends EngagementProgress>(
  progress: T,
  mission: MissionDefinition,
  requestId: string,
): T {
  const key = missionKey(mission.trackId, mission.id)
  const engagement = progress.missionEngagementByKey[key] ?? emptyMissionEngagement()
  if (engagement.hintRequestIds.includes(requestId)) return progress
  return {
    ...progress,
    missionEngagementByKey: {
      ...progress.missionEngagementByKey,
      [key]: {
        ...engagement,
        hintsRequested: engagement.hintsRequested + 1,
        hintRequestIds: [...engagement.hintRequestIds, requestId],
      },
    },
  }
}

export function recordMissionEngagementCompletion<T extends EngagementProgress>(
  progress: T,
  mission: MissionDefinition,
  input: {
    readonly now: Date
    readonly kind?: MissionCompletionKind
    readonly canonicalReviewKey?: string
  },
): {
  readonly progress: T
  readonly completionKind: MissionPracticeKind
  readonly canonicalReviewKey: string | undefined
} {
  const key = missionKey(mission.trackId, mission.id)
  const previous = progress.missionEngagementByKey[key] ?? emptyMissionEngagement()
  const canonicalReviewKey =
    input.canonicalReviewKey ?? previous.activeCanonicalReviewKey ?? undefined
  return {
    progress: {
      ...progress,
      missionEngagementByKey: {
        ...progress.missionEngagementByKey,
        [key]: {
          ...previous,
          attempts: Math.max(1, previous.attempts),
          practiceCount: previous.practiceCount + 1,
          practiceCompleted: true,
          applicationCompleted: mission.stages.includes('apply') || previous.applicationCompleted,
          retryRecommended: false,
          lastCompletedAt: input.now.toISOString(),
          completedReviewKeys:
            canonicalReviewKey === undefined
              ? previous.completedReviewKeys
              : Array.from(new Set([...previous.completedReviewKeys, canonicalReviewKey])),
          activePracticeKind: 'initial',
          activeCanonicalReviewKey: null,
        },
      },
    },
    completionKind: input.kind ?? previous.activePracticeKind,
    canonicalReviewKey,
  }
}
