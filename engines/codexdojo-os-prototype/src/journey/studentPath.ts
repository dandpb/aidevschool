import type { MissionCatalogSnapshot, TrackId } from '../domain'
import type { OsProgress } from '../progress/domain'
import { missionKey } from '../progress/domain'

export const STUDENT_TRACK_ID: TrackId = 'ai-pratica'
export const HOSTED_SIMULATIONS_TRACK_ID: TrackId = 'dev'

export const STUDENT_MISSION_CHAPTERS = [
  {
    id: 'literacy' as const,
    label: 'IA Prática',
    detail: 'Uso consciente sem exigir código',
    trackId: STUDENT_TRACK_ID,
  },
  {
    id: 'hosted-simulations' as const,
    label: 'Simulações hospedadas',
    detail: 'WAREHOUSE, WORMHOLE e RELAY STATION no OS',
    trackId: HOSTED_SIMULATIONS_TRACK_ID,
  },
] as const

export function isAiPraticaChapterComplete(
  progress: OsProgress,
  catalog: MissionCatalogSnapshot,
): boolean {
  return catalog.missions
    .filter((mission) => mission.trackId === STUDENT_TRACK_ID)
    .every((mission) => progress.missionStatusByKey[missionKey(mission.trackId, mission.id)] === 'completed')
}

export function remapLegacyDevTrackProgress(
  progress: OsProgress,
  catalog: MissionCatalogSnapshot,
): { readonly progress: OsProgress; readonly changed: boolean } {
  const literacyIncomplete = !isAiPraticaChapterComplete(progress, catalog)
  let changed = false
  let next = progress

  if (next.onboarding.selectedTrackId === HOSTED_SIMULATIONS_TRACK_ID) {
    next = {
      ...next,
      onboarding: { ...next.onboarding, selectedTrackId: STUDENT_TRACK_ID },
    }
    changed = true
  }

  if (literacyIncomplete) {
    if (next.onboarding.recommendedTrackId === HOSTED_SIMULATIONS_TRACK_ID) {
      next = {
        ...next,
        onboarding: { ...next.onboarding, recommendedTrackId: STUDENT_TRACK_ID },
      }
      changed = true
    }
    if (next.activeTrackId === HOSTED_SIMULATIONS_TRACK_ID) {
      next = {
        ...next,
        activeTrackId: STUDENT_TRACK_ID,
        activeMissionId: null,
      }
      changed = true
    }
  }

  return { progress: next, changed }
}
