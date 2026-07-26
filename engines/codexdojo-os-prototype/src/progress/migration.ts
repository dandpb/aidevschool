import type { MissionCatalogSnapshot, MissionKey, TrackId } from '../domain'
import {
  DAILY_GOAL_XP,
  OS_PROGRESS_SCHEMA_VERSION,
  type AchievementId,
  type LocalAchievement,
  type LocalMissionStatus,
  type MissionEngagement,
  type OsProgress,
  createInitialOsProgress,
  emptyMissionEngagement,
  missionKey,
  reconcileMissionAvailability,
} from './domain'

export type ProgressMigrationResult =
  | { readonly kind: 'loaded'; readonly progress: OsProgress }
  | { readonly kind: 'reset'; readonly progress: OsProgress; readonly reason: string }

const ACHIEVEMENT_IDS = new Set<AchievementId>([
  'first-mission',
  'first-practice',
  'ai-pratica-started',
  'dev-started',
  'three-missions',
  'streak-3',
  'streak-7',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTrackId(value: unknown): value is TrackId {
  return value === 'ai-pratica' || value === 'dev'
}

function isMissionStatus(value: unknown): value is LocalMissionStatus {
  return value === 'locked' || value === 'available' || value === 'in_progress' || value === 'completed'
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function validOnboarding(onboarding: Record<string, unknown>): boolean {
  return (
    typeof onboarding.completed === 'boolean' &&
    (onboarding.goal === undefined || onboarding.goal === 'work-better' || onboarding.goal === 'understand-ai' || onboarding.goal === 'build-systems') &&
    (onboarding.context === undefined || onboarding.context === 'work' || onboarding.context === 'studies' || onboarding.context === 'personal-project') &&
    (onboarding.confidence === undefined || onboarding.confidence === 'low' || onboarding.confidence === 'medium' || onboarding.confidence === 'high') &&
    (onboarding.recommendedTrackId === undefined || isTrackId(onboarding.recommendedTrackId)) &&
    (onboarding.selectedTrackId === undefined || isTrackId(onboarding.selectedTrackId))
  )
}

// Per-key defaults are left empty on purpose: decodeProgress seeds every mission
// from createInitialOsProgress anyway, so filling them here only walks the catalog twice.
function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    schemaVersion: 2,
    missionVersionsByKey: raw.missionVersionsByKey ?? {},
    preferredNextMissionByTrack: raw.preferredNextMissionByTrack ?? {},
  }
}

function migrateV2ToV3(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    schemaVersion: 3,
    xp: 0,
    dailyGoalXp: DAILY_GOAL_XP,
    dailyXpByLocalDate: {},
    localEngagementStreak: { current: 0, longest: 0, lastActiveLocalDate: null },
    achievements: [],
    missionEngagementByKey: {},
    rewardedActivityKeys: [],
  }
}

function migrateSequentially(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (raw.schemaVersion === 1) return migrateV2ToV3(migrateV1ToV2(raw))
  if (raw.schemaVersion === 2) return migrateV2ToV3(raw)
  if (raw.schemaVersion === OS_PROGRESS_SCHEMA_VERSION) return raw
  return null
}

function decodeMissionEngagement(value: unknown): MissionEngagement | null {
  if (!isRecord(value)) return null
  if (
    !isNonNegativeInteger(value.attempts) ||
    !isStringArray(value.attemptIds) ||
    !isNonNegativeInteger(value.hintsRequested) ||
    !isStringArray(value.hintRequestIds) ||
    !isNonNegativeInteger(value.practiceCount) ||
    typeof value.practiceCompleted !== 'boolean' ||
    typeof value.applicationCompleted !== 'boolean' ||
    typeof value.retryRecommended !== 'boolean' ||
    (value.lastAttemptAt !== null && typeof value.lastAttemptAt !== 'string') ||
    (value.lastCompletedAt !== null && typeof value.lastCompletedAt !== 'string') ||
    !isStringArray(value.completedReviewKeys) ||
    (value.activePracticeKind !== 'initial' &&
      value.activePracticeKind !== 'review' &&
      value.activePracticeKind !== 'retry' &&
      value.activePracticeKind !== 'targeted-practice') ||
    (value.activeCanonicalReviewKey !== null && typeof value.activeCanonicalReviewKey !== 'string')
  ) return null
  return {
    attempts: value.attempts,
    attemptIds: value.attemptIds,
    hintsRequested: value.hintsRequested,
    hintRequestIds: value.hintRequestIds,
    practiceCount: value.practiceCount,
    practiceCompleted: value.practiceCompleted,
    applicationCompleted: value.applicationCompleted,
    retryRecommended: value.retryRecommended,
    lastAttemptAt: value.lastAttemptAt,
    lastCompletedAt: value.lastCompletedAt,
    completedReviewKeys: value.completedReviewKeys,
    activePracticeKind: value.activePracticeKind,
    activeCanonicalReviewKey: value.activeCanonicalReviewKey,
  }
}

function decodeAchievements(value: unknown): LocalAchievement[] | null {
  if (!Array.isArray(value)) return null
  const achievements: LocalAchievement[] = []
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      !ACHIEVEMENT_IDS.has(item.id as AchievementId) ||
      typeof item.earnedAt !== 'string'
    ) return null
    achievements.push({ id: item.id as AchievementId, earnedAt: item.earnedAt })
  }
  return achievements
}

function decodeProgress(rawInput: Record<string, unknown>, catalog: MissionCatalogSnapshot): OsProgress | null {
  const raw = migrateSequentially(rawInput)
  if (raw === null) return null
  if (!isRecord(raw.onboarding) || !validOnboarding(raw.onboarding)) return null
  if (!isRecord(raw.contentVersionsByTrack) || !isRecord(raw.missionStatusByKey)) return null
  if (raw.activeTrackId !== null && !isTrackId(raw.activeTrackId)) return null
  if (raw.activeMissionId !== null && typeof raw.activeMissionId !== 'string') return null
  if (
    !isNonNegativeInteger(raw.xp) ||
    !isNonNegativeInteger(raw.dailyGoalXp) ||
    !isRecord(raw.dailyXpByLocalDate) ||
    !isRecord(raw.localEngagementStreak) ||
    !isRecord(raw.missionEngagementByKey) ||
    !isStringArray(raw.rewardedActivityKeys)
  ) return null
  if (
    !isNonNegativeInteger(raw.localEngagementStreak.current) ||
    !isNonNegativeInteger(raw.localEngagementStreak.longest) ||
    (raw.localEngagementStreak.lastActiveLocalDate !== null && typeof raw.localEngagementStreak.lastActiveLocalDate !== 'string')
  ) return null
  for (const value of Object.values(raw.dailyXpByLocalDate)) {
    if (!isNonNegativeInteger(value)) return null
  }
  const achievements = decodeAchievements(raw.achievements)
  if (achievements === null) return null

  const initial = createInitialOsProgress(catalog)
  const previousVersions = isRecord(raw.missionVersionsByKey) ? raw.missionVersionsByKey : {}
  const statuses = { ...initial.missionStatusByKey } as Record<MissionKey, LocalMissionStatus>
  const missionEngagementByKey = { ...initial.missionEngagementByKey } as Record<MissionKey, MissionEngagement>
  for (const mission of catalog.missions) {
    const key = missionKey(mission.trackId, mission.id)
    const previousStatus = raw.missionStatusByKey[key]
    const previousVersion = previousVersions[key]
    const versionCompatible = previousVersion === undefined || previousVersion === mission.version
    if (isMissionStatus(previousStatus) && (previousStatus === 'completed' || versionCompatible)) {
      statuses[key] = previousStatus
    }
    const engagement = decodeMissionEngagement(raw.missionEngagementByKey[key])
    if (engagement !== null) missionEngagementByKey[key] = engagement
    else if (rawInput.schemaVersion === OS_PROGRESS_SCHEMA_VERSION) return null
    else missionEngagementByKey[key] = emptyMissionEngagement()
  }

  const preferred: Partial<Record<TrackId, string>> = {}
  if (isRecord(raw.preferredNextMissionByTrack)) {
    for (const trackId of ['ai-pratica', 'dev'] as const) {
      const missionId = raw.preferredNextMissionByTrack[trackId]
      if (
        typeof missionId === 'string' &&
        catalog.missions.some((mission) => mission.trackId === trackId && mission.id === missionId)
      ) preferred[trackId] = missionId
    }
  }

  const activeMissionExists =
    raw.activeTrackId !== null &&
    typeof raw.activeMissionId === 'string' &&
    catalog.missions.some(
      (mission) => mission.trackId === raw.activeTrackId && mission.id === raw.activeMissionId,
    )
  const onboarding = raw.onboarding
  return reconcileMissionAvailability({
    schemaVersion: OS_PROGRESS_SCHEMA_VERSION,
    contentVersionsByTrack: initial.contentVersionsByTrack,
    onboarding: {
      completed: onboarding.completed as boolean,
      goal: onboarding.goal as OsProgress['onboarding']['goal'],
      context: onboarding.context as OsProgress['onboarding']['context'],
      confidence: onboarding.confidence as OsProgress['onboarding']['confidence'],
      recommendedTrackId: onboarding.recommendedTrackId as TrackId | undefined,
      selectedTrackId: onboarding.selectedTrackId as TrackId | undefined,
    },
    activeTrackId: raw.activeTrackId,
    activeMissionId: activeMissionExists ? (raw.activeMissionId as string) : null,
    missionStatusByKey: statuses,
    missionVersionsByKey: initial.missionVersionsByKey,
    preferredNextMissionByTrack: preferred,
    xp: raw.xp,
    dailyGoalXp: raw.dailyGoalXp,
    dailyXpByLocalDate: raw.dailyXpByLocalDate as Record<string, number>,
    localEngagementStreak: {
      current: raw.localEngagementStreak.current,
      longest: raw.localEngagementStreak.longest,
      lastActiveLocalDate: raw.localEngagementStreak.lastActiveLocalDate,
    },
    achievements,
    missionEngagementByKey,
    rewardedActivityKeys: raw.rewardedActivityKeys,
  }, catalog)
}

export function migrateOsProgress(
  raw: unknown | null,
  catalog: MissionCatalogSnapshot,
): ProgressMigrationResult {
  if (raw === null) {
    return { kind: 'reset', progress: createInitialOsProgress(catalog), reason: 'first-run' }
  }
  if (isRecord(raw) && typeof raw.schemaVersion === 'number' && raw.schemaVersion > OS_PROGRESS_SCHEMA_VERSION) {
    return {
      kind: 'reset',
      progress: createInitialOsProgress(catalog),
      reason: 'future-schema-version',
    }
  }
  if (!isRecord(raw)) {
    return { kind: 'reset', progress: createInitialOsProgress(catalog), reason: 'malformed-state' }
  }
  const decoded = decodeProgress(raw, catalog)
  if (decoded === null) {
    return { kind: 'reset', progress: createInitialOsProgress(catalog), reason: 'malformed-state' }
  }
  return { kind: 'loaded', progress: decoded }
}
