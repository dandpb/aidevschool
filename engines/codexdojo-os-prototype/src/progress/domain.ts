import type { MissionCatalogSnapshot, MissionDefinition, MissionKey, TrackId } from '../domain'

export const OS_PROGRESS_SCHEMA_VERSION = 1

export type LocalMissionStatus = 'locked' | 'available' | 'in_progress' | 'completed'
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
  readonly schemaVersion: 1
  readonly contentVersionsByTrack: Readonly<Partial<Record<TrackId, string>>>
  readonly onboarding: OsOnboarding
  readonly activeTrackId: TrackId | null
  readonly activeMissionId: string | null
  readonly missionStatusByKey: Readonly<Record<MissionKey, LocalMissionStatus>>
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

export function missionKey(trackId: TrackId, missionId: string): MissionKey {
  return `${trackId}:${missionId}`
}

export function createInitialOsProgress(catalog: MissionCatalogSnapshot): OsProgress {
  const missionStatusByKey = Object.fromEntries(
    catalog.missions.map((mission) => [
      missionKey(mission.trackId, mission.id),
      mission.prerequisites.length === 0 ? 'available' : 'locked',
    ]),
  ) as Record<MissionKey, LocalMissionStatus>
  return {
    schemaVersion: OS_PROGRESS_SCHEMA_VERSION,
    contentVersionsByTrack: { 'ai-pratica': catalog.contentVersion },
    onboarding: { completed: false },
    activeTrackId: null,
    activeMissionId: null,
    missionStatusByKey,
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

export function startMission(progress: OsProgress, mission: MissionDefinition): OsProgress {
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
  }
}

export function recordMissionCompletion(
  progress: OsProgress,
  mission: MissionDefinition,
): OsProgress {
  const key = missionKey(mission.trackId, mission.id)
  return {
    ...progress,
    activeTrackId: mission.trackId,
    activeMissionId: mission.id,
    missionStatusByKey: { ...progress.missionStatusByKey, [key]: 'completed' },
  }
}
