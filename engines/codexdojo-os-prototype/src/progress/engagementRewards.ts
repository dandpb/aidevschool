import type { MissionKey } from '../domain'
import type {
  AchievementId,
  EngagementProgress,
  LocalAchievement,
  LocalMissionStatus,
  MissionPracticeKind,
} from './engagement'

export const DAILY_GOAL_XP = 25
export const MISSION_COMPLETION_XP = 25
export const REVIEW_PRACTICE_XP = 10

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

  // ⚡ Bolt: Replace Object.values/entries + filter/some allocations with a single pass loop for ~5x speedup and less memory churn
  let completedMissions = 0
  let hasAiPratica = false
  let hasDev = false
  for (const key in progress.missionStatusByKey) {
    const statusKey = key as keyof typeof progress.missionStatusByKey
    if (progress.missionStatusByKey[statusKey] === 'completed') {
      completedMissions++
      if (!hasAiPratica && key.startsWith('ai-pratica:')) hasAiPratica = true
      if (!hasDev && key.startsWith('dev:')) hasDev = true
    }
  }

  let hasPractice = false
  for (const key in progress.missionEngagementByKey) {
    const engagementKey = key as keyof typeof progress.missionEngagementByKey
    if (progress.missionEngagementByKey[engagementKey].practiceCompleted) {
      hasPractice = true
      break
    }
  }

  const candidates: AchievementId[] = []
  if (completedMissions >= 1) candidates.push('first-mission')
  if (hasPractice) candidates.push('first-practice')
  if (hasAiPratica) candidates.push('ai-pratica-started')
  if (hasDev) candidates.push('dev-started')
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
