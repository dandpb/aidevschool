import type { MissionCatalogRepository } from './catalog'
import type { OsProgress } from '../progress/domain'
import { missionKey } from '../progress/domain'

export type MissionRecommendation =
  | { readonly kind: 'onboarding' }
  | { readonly kind: 'resume'; readonly trackId: 'ai-pratica' | 'dev'; readonly missionId: string }
  | { readonly kind: 'start'; readonly trackId: 'ai-pratica' | 'dev'; readonly missionId: string }
  | { readonly kind: 'none' }

export function recommendMission(
  progress: OsProgress,
  catalog: MissionCatalogRepository,
): MissionRecommendation {
  if (!progress.onboarding.completed) return { kind: 'onboarding' }
  if (progress.activeTrackId !== null && progress.activeMissionId !== null) {
    const activeKey = missionKey(progress.activeTrackId, progress.activeMissionId)
    if (progress.missionStatusByKey[activeKey] === 'in_progress') {
      return {
        kind: 'resume',
        trackId: progress.activeTrackId,
        missionId: progress.activeMissionId,
      }
    }
  }
  const trackId = progress.onboarding.selectedTrackId ?? progress.activeTrackId ?? 'ai-pratica'
  const first = catalog
    .listLaunchable(trackId)
    .find((mission) => progress.missionStatusByKey[missionKey(trackId, mission.id)] === 'available')
  return first === undefined
    ? { kind: 'none' }
    : { kind: 'start', trackId: first.trackId, missionId: first.id }
}
