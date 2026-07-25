import type { MissionCatalogSnapshot, MissionKey, TrackId } from '../domain'
import {
  OS_PROGRESS_SCHEMA_VERSION,
  type LocalMissionStatus,
  type OsProgress,
  createInitialOsProgress,
} from './domain'

export type ProgressMigrationResult =
  | { readonly kind: 'loaded'; readonly progress: OsProgress }
  | { readonly kind: 'reset'; readonly progress: OsProgress; readonly reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTrackId(value: unknown): value is TrackId {
  return value === 'ai-pratica' || value === 'dev'
}

function isMissionStatus(value: unknown): value is LocalMissionStatus {
  return value === 'locked' || value === 'available' || value === 'in_progress' || value === 'completed'
}

function decodeProgress(raw: unknown, catalog: MissionCatalogSnapshot): OsProgress | null {
  if (!isRecord(raw) || raw.schemaVersion !== OS_PROGRESS_SCHEMA_VERSION) return null
  if (!isRecord(raw.onboarding) || typeof raw.onboarding.completed !== 'boolean') return null
  if (!isRecord(raw.contentVersionsByTrack) || !isRecord(raw.missionStatusByKey)) return null
  if (raw.activeTrackId !== null && !isTrackId(raw.activeTrackId)) return null
  if (raw.activeMissionId !== null && typeof raw.activeMissionId !== 'string') return null

  const initial = createInitialOsProgress(catalog)
  const statuses = { ...initial.missionStatusByKey } as Record<MissionKey, LocalMissionStatus>
  for (const [key, status] of Object.entries(raw.missionStatusByKey)) {
    if (key in statuses && isMissionStatus(status)) statuses[key as MissionKey] = status
  }
  const onboarding = raw.onboarding
  if (
    onboarding.goal !== undefined &&
    onboarding.goal !== 'work-better' &&
    onboarding.goal !== 'understand-ai' &&
    onboarding.goal !== 'build-systems'
  ) {
    return null
  }
  if (
    onboarding.context !== undefined &&
    onboarding.context !== 'work' &&
    onboarding.context !== 'studies' &&
    onboarding.context !== 'personal-project'
  ) {
    return null
  }
  if (
    onboarding.confidence !== undefined &&
    onboarding.confidence !== 'low' &&
    onboarding.confidence !== 'medium' &&
    onboarding.confidence !== 'high'
  ) {
    return null
  }
  if (
    (onboarding.recommendedTrackId !== undefined && !isTrackId(onboarding.recommendedTrackId)) ||
    (onboarding.selectedTrackId !== undefined && !isTrackId(onboarding.selectedTrackId))
  ) {
    return null
  }
  return {
    schemaVersion: 1,
    contentVersionsByTrack: { ...initial.contentVersionsByTrack },
    onboarding: {
      completed: onboarding.completed as boolean,
      goal: onboarding.goal,
      context: onboarding.context,
      confidence: onboarding.confidence,
      recommendedTrackId: onboarding.recommendedTrackId,
      selectedTrackId: onboarding.selectedTrackId,
    },
    activeTrackId: raw.activeTrackId,
    activeMissionId: raw.activeMissionId,
    missionStatusByKey: statuses,
  }
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
  const decoded = decodeProgress(raw, catalog)
  if (decoded === null) {
    return { kind: 'reset', progress: createInitialOsProgress(catalog), reason: 'malformed-state' }
  }
  return { kind: 'loaded', progress: decoded }
}
