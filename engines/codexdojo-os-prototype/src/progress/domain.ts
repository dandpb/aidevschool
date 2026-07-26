import type { MissionCatalogSnapshot, MissionDefinition, MissionKey, TrackId } from '../domain'
import { DAILY_GOAL_XP, emptyMissionEngagement, missionKey, recordMissionEngagementCompletion, rewardMissionCompletion } from './engagement'
import type { LocalAchievement, LocalEngagementStreak, LocalMissionStatus, MissionCompletionKind, MissionEngagement, MissionPracticeKind } from './engagement'

export const OS_PROGRESS_SCHEMA_VERSION = 3
export {
  DAILY_GOAL_XP, MISSION_COMPLETION_XP, REVIEW_PRACTICE_XP, dailyGoalMet, dailyXp,
  emptyMissionEngagement, missionKey, recordHintRequest, recordMissionAttempt, toLocalDateKey,
} from './engagement'
export type {
  AchievementId, LocalAchievement, LocalEngagementStreak, LocalMissionStatus,
  MissionAttemptInput, MissionCompletionKind, MissionEngagement, MissionPracticeKind,
} from './engagement'

export type OnboardingGoal = 'work-better' | 'understand-ai' | 'build-systems'
export type OnboardingContext = 'work' | 'studies' | 'personal-project'
export type OnboardingConfidence = 'low' | 'medium' | 'high'

export type OsOnboarding = {
  readonly completed: boolean
  readonly goal?: OnboardingGoal
  readonly context?: OnboardingContext
  readonly confidence?: OnboardingConfidence
  readonly recommendedTrackId?: TrackId
  readonly selectedTrackId?: TrackId
}

export type OsProgress = {
  readonly schemaVersion: 3
  readonly contentVersionsByTrack: Readonly<Partial<Record<TrackId, string>>>
  readonly onboarding: OsOnboarding
  readonly activeTrackId: TrackId | null
  readonly activeMissionId: string | null
  readonly missionStatusByKey: Readonly<Record<MissionKey, LocalMissionStatus>>
  readonly missionVersionsByKey: Readonly<Record<MissionKey, number>>
  readonly preferredNextMissionByTrack: Readonly<Partial<Record<TrackId, string>>>
  readonly xp: number
  readonly dailyGoalXp: number
  readonly dailyXpByLocalDate: Readonly<Record<string, number>>
  readonly localEngagementStreak: LocalEngagementStreak
  readonly achievements: readonly LocalAchievement[]
  readonly missionEngagementByKey: Readonly<Record<MissionKey, MissionEngagement>>
  readonly rewardedActivityKeys: readonly string[]
}

export interface OsProgressRepository {
  load(): Promise<unknown | null>
  save(progress: OsProgress): Promise<void>
  reset(): Promise<void>
}

export type OnboardingInput = {
  readonly goal: OnboardingGoal
  readonly context: OnboardingContext
  readonly confidence: OnboardingConfidence
  readonly selectedTrackId: TrackId
}

export type MissionStartOptions = {
  readonly kind?: MissionPracticeKind
  readonly canonicalReviewKey?: string
}

export type MissionCompletionOptions = {
  readonly now?: Date
  readonly kind?: MissionCompletionKind
  readonly canonicalReviewKey?: string
}

export function createInitialOsProgress(catalog: MissionCatalogSnapshot): OsProgress {
  const missionStatusByKey = Object.fromEntries(
    catalog.missions.map((mission) => [
      missionKey(mission.trackId, mission.id),
      mission.prerequisites.length === 0 ? 'available' : 'locked',
    ]),
  ) as Record<MissionKey, LocalMissionStatus>
  const missionVersionsByKey = Object.fromEntries(
    catalog.missions.map((mission) => [missionKey(mission.trackId, mission.id), mission.version]),
  ) as Record<MissionKey, number>
  const missionEngagementByKey = Object.fromEntries(
    catalog.missions.map((mission) => [
      missionKey(mission.trackId, mission.id),
      emptyMissionEngagement(),
    ]),
  ) as Record<MissionKey, MissionEngagement>
  return {
    schemaVersion: OS_PROGRESS_SCHEMA_VERSION,
    contentVersionsByTrack: Object.fromEntries(
      catalog.tracks.map((track) => [track.id, track.contentVersion]),
    ),
    onboarding: { completed: false },
    activeTrackId: null,
    activeMissionId: null,
    missionStatusByKey,
    missionVersionsByKey,
    preferredNextMissionByTrack: {},
    xp: 0,
    dailyGoalXp: DAILY_GOAL_XP,
    dailyXpByLocalDate: {},
    localEngagementStreak: { current: 0, longest: 0, lastActiveLocalDate: null },
    achievements: [],
    missionEngagementByKey,
    rewardedActivityKeys: [],
  }
}

export function recommendTrack(input: Pick<OnboardingInput, 'goal' | 'confidence'>): TrackId {
  return input.goal === 'build-systems' && input.confidence !== 'low' ? 'dev' : 'ai-pratica'
}

export function completeOnboarding(progress: OsProgress, input: OnboardingInput): OsProgress {
  return {
    ...progress,
    onboarding: {
      completed: true,
      goal: input.goal,
      context: input.context,
      confidence: input.confidence,
      recommendedTrackId: recommendTrack(input),
      selectedTrackId: input.selectedTrackId,
    },
    activeTrackId: input.selectedTrackId,
  }
}

export function startMission(
  progress: OsProgress,
  mission: MissionDefinition,
  options: MissionStartOptions = {},
): OsProgress {
  const key = missionKey(mission.trackId, mission.id)
  const status = progress.missionStatusByKey[key]
  if (status !== 'available' && status !== 'in_progress' && status !== 'completed') {
    throw new Error(`Mission ${key} is not launchable from local status ${String(status)}`)
  }
  return {
    ...progress,
    activeTrackId: mission.trackId,
    activeMissionId: mission.id,
    missionStatusByKey: {
      ...progress.missionStatusByKey,
      [key]: status === 'completed' ? 'completed' : 'in_progress',
    },
    missionEngagementByKey: {
      ...progress.missionEngagementByKey,
      [key]: {
        ...(progress.missionEngagementByKey[key] ?? emptyMissionEngagement()),
        activePracticeKind: options.kind ?? 'initial',
        activeCanonicalReviewKey: options.canonicalReviewKey ?? null,
      },
    },
    preferredNextMissionByTrack: {
      ...progress.preferredNextMissionByTrack,
      [mission.trackId]: undefined,
    },
  }
}

export function recordMissionCompletion(
  progress: OsProgress,
  mission: MissionDefinition,
  catalog: MissionCatalogSnapshot,
  preferredNextMissionId?: string,
  options: MissionCompletionOptions = {},
): OsProgress {
  const key = missionKey(mission.trackId, mission.id)
  const now = options.now ?? new Date()
  const previousStatus = progress.missionStatusByKey[key]
  const engagement = recordMissionEngagementCompletion(progress, mission, {
    now,
    kind: options.kind,
    canonicalReviewKey: options.canonicalReviewKey,
  })
  const completed: OsProgress = {
    ...engagement.progress,
    activeTrackId: mission.trackId,
    activeMissionId: mission.id,
    missionStatusByKey: { ...progress.missionStatusByKey, [key]: 'completed' },
  }
  const reconciled = reconcileMissionAvailability(completed, catalog)
  const preferred = catalog.missions.find(
    (candidate) =>
      candidate.trackId === mission.trackId &&
      candidate.id === preferredNextMissionId &&
      reconciled.missionStatusByKey[missionKey(candidate.trackId, candidate.id)] !== 'locked',
  )
  const withPreference: OsProgress = {
    ...reconciled,
    preferredNextMissionByTrack: {
      ...reconciled.preferredNextMissionByTrack,
      [mission.trackId]: preferred?.id,
    },
  }
  return rewardMissionCompletion(withPreference, {
    key,
    previousStatus,
    completionKind: engagement.completionKind,
    canonicalReviewKey: engagement.canonicalReviewKey,
    now,
  })
}

export function reconcileMissionAvailability(
  progress: OsProgress,
  catalog: MissionCatalogSnapshot,
): OsProgress {
  const missionStatusByKey = { ...progress.missionStatusByKey }
  for (const mission of catalog.missions) {
    const key = missionKey(mission.trackId, mission.id)
    if (
      missionStatusByKey[key] === 'locked' &&
      mission.prerequisites.every(
        (prerequisite) =>
          missionStatusByKey[missionKey(mission.trackId, prerequisite)] === 'completed',
      )
    ) {
      missionStatusByKey[key] = 'available'
    }
  }
  return { ...progress, missionStatusByKey }
}

export function switchTrack(
  progress: OsProgress,
  trackId: TrackId,
  catalog: MissionCatalogSnapshot,
): OsProgress {
  const inProgress = catalog.missions.find(
    (mission) =>
      mission.trackId === trackId &&
      progress.missionStatusByKey[missionKey(trackId, mission.id)] === 'in_progress',
  )
  return {
    ...progress,
    onboarding: { ...progress.onboarding, selectedTrackId: trackId },
    activeTrackId: trackId,
    activeMissionId: inProgress?.id ?? null,
  }
}
