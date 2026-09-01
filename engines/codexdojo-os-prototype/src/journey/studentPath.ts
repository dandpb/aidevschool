import type { MissionCatalogSnapshot, MissionDefinition, TrackId } from '../domain'
import type { OsProgress } from '../progress/domain'
import { missionKey } from '../progress/domain'

export const STUDENT_TRACK_ID: TrackId = 'ai-pratica'
export const HOSTED_SIMULATIONS_TRACK_ID: TrackId = 'dev'

export const DEV_GUIDED_RAIL_MISSION_IDS = [
  'game-02-warehouse',
  'game-03-wormhole',
  'game-05-relay-station',
] as const

export const STUDENT_MISSION_CHAPTERS = [
  {
    id: 'literacy' as const,
    label: 'IA Prática',
    detail: 'Uso consciente sem exigir código',
    trackId: STUDENT_TRACK_ID,
  },
  {
    id: 'hosted-simulations' as const,
    label: 'Dev',
    detail: 'Trilho guiado: WAREHOUSE → WORMHOLE → RELAY STATION',
    trackId: HOSTED_SIMULATIONS_TRACK_ID,
  },
] as const

export function requestedTrackIdFromSearch(
  search = typeof window === 'undefined' ? '' : window.location.search,
): TrackId | undefined {
  const track = new URLSearchParams(search).get('track')
  if (track === 'dev') return HOSTED_SIMULATIONS_TRACK_ID
  if (track === 'ai-pratica') return STUDENT_TRACK_ID
  return undefined
}

export function isAiPraticaChapterComplete(
  progress: OsProgress,
  catalog: MissionCatalogSnapshot,
): boolean {
  return catalog.missions
    .filter((mission) => mission.trackId === STUDENT_TRACK_ID)
    .every((mission) => progress.missionStatusByKey[missionKey(mission.trackId, mission.id)] === 'completed')
}

export function isStudentRailMission(mission: Pick<MissionDefinition, 'trackId' | 'id'>): boolean {
  if (mission.trackId === STUDENT_TRACK_ID) return true
  if (mission.trackId !== HOSTED_SIMULATIONS_TRACK_ID) return false
  return (DEV_GUIDED_RAIL_MISSION_IDS as readonly string[]).includes(mission.id)
}

export function listStudentRailMissions(
  catalog: { readonly listLaunchable: (trackId?: TrackId) => readonly MissionDefinition[] },
  trackId?: TrackId,
): readonly MissionDefinition[] {
  return catalog.listLaunchable(trackId).filter(isStudentRailMission)
}

export function remapLegacyDevTrackProgress(
  progress: OsProgress,
  _catalog: MissionCatalogSnapshot,
): { readonly progress: OsProgress; readonly changed: boolean } {
  // Public offer: Dev is a first-class track. Do not rewrite selectedTrackId
  // back to IA Prática, and do not wipe completed literacy missions when the
  // learner chooses Dev again.
  void _catalog
  return { progress, changed: false }
}
