import type { MissionDefinition, MissionKey, TrackId } from '../domain'

/** Lives here rather than in ./domain because domain imports from this module. */
export function missionKey(trackId: TrackId, missionId: string): MissionKey {
  return `${trackId}:${missionId}`
}

export const DAILY_GOAL_XP = 25
export const MISSION_COMPLETION_XP = 25
export const REVIEW_PRACTICE_XP = 10

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

type EngagementProgress = {
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

export function toLocalDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dailyXp(progress: EngagementProgress, now: Date): number {
  return progress.dailyXpByLocalDate[toLocalDateKey(now)] ?? 0
}

export function dailyGoalMet(progress: EngagementProgress, now: Date): boolean {
  return dailyXp(progress, now) >= progress.dailyGoalXp
}

function dayDistance(previous: string, current: string): number {
  const previousDate = new Date(`${previous}T00:00:00Z`)
  const currentDate = new Date(`${current}T00:00:00Z`)
  return Math.round((currentDate.getTime() - previousDate.getTime()) / 86_400_000)
}

function awardEngagementXp<T extends EngagementProgress>(
  progress: T,
  amount: number,
  activityKey: string,
  now: Date,
): T {
  if (progress.rewardedActivityKeys.includes(activityKey)) return progress
  const localDate = toLocalDateKey(now)
  const previousDate = progress.localEngagementStreak.lastActiveLocalDate
  const current = previousDate === localDate
    ? progress.localEngagementStreak.current
    : previousDate !== null && dayDistance(previousDate, localDate) === 1
      ? progress.localEngagementStreak.current + 1
      : 1
  return {
    ...progress,
    xp: progress.xp + amount,
    dailyXpByLocalDate: {
      ...progress.dailyXpByLocalDate,
      [localDate]: (progress.dailyXpByLocalDate[localDate] ?? 0) + amount,
    },
    localEngagementStreak: {
      current,
      longest: Math.max(progress.localEngagementStreak.longest, current),
      lastActiveLocalDate: localDate,
    },
    rewardedActivityKeys: [...progress.rewardedActivityKeys, activityKey],
  }
}

function unlockAchievements<T extends EngagementProgress>(progress: T, now: Date): T {
  const existing = new Set(progress.achievements.map((achievement) => achievement.id))
  const completedMissions = Object.values(progress.missionStatusByKey).filter(
    (status) => status === 'completed',
  ).length
  const engagements = Object.values(progress.missionEngagementByKey)
  const candidates: AchievementId[] = []
  if (completedMissions >= 1) candidates.push('first-mission')
  if (engagements.some((engagement) => engagement.practiceCompleted)) candidates.push('first-practice')
  if (
    Object.entries(progress.missionStatusByKey).some(
      ([key, status]) => key.startsWith('ai-pratica:') && status === 'completed',
    )
  ) candidates.push('ai-pratica-started')
  if (
    Object.entries(progress.missionStatusByKey).some(
      ([key, status]) => key.startsWith('dev:') && status === 'completed',
    )
  ) candidates.push('dev-started')
  if (completedMissions >= 3) candidates.push('three-missions')
  if (progress.localEngagementStreak.current >= 3) candidates.push('streak-3')
  if (progress.localEngagementStreak.current >= 7) candidates.push('streak-7')
  const earnedAt = now.toISOString()
  const unlocked = candidates
    .filter((id) => !existing.has(id))
    .map((id) => ({ id, earnedAt }) satisfies LocalAchievement)
  return unlocked.length === 0
    ? progress
    : { ...progress, achievements: [...progress.achievements, ...unlocked] }
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
  const canonicalReviewKey = input.canonicalReviewKey ?? previous.activeCanonicalReviewKey ?? undefined
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
          completedReviewKeys: canonicalReviewKey === undefined
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

export function rewardMissionCompletion<T extends EngagementProgress>(
  progress: T,
  input: {
    readonly key: MissionKey
    readonly previousStatus: LocalMissionStatus | undefined
    readonly completionKind: MissionPracticeKind
    readonly canonicalReviewKey: string | undefined
    readonly now: Date
  },
): T {
  const rewardKey = input.previousStatus !== 'completed'
    ? `completion:${input.key}`
    : input.completionKind === 'review'
      ? `review:${input.key}:${input.canonicalReviewKey ?? toLocalDateKey(input.now)}`
      : input.completionKind === 'retry'
        ? `retry:${input.key}:${toLocalDateKey(input.now)}`
        : `completion:${input.key}`
  const reward = input.previousStatus !== 'completed'
    ? MISSION_COMPLETION_XP
    : REVIEW_PRACTICE_XP
  return unlockAchievements(awardEngagementXp(progress, reward, rewardKey, input.now), input.now)
}
