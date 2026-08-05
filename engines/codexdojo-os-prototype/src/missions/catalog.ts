import { missionCatalog } from '../data/missions'
import type { MissionCatalogSnapshot, MissionDefinition, TrackId } from '../domain'

export interface MissionCatalogRepository {
  snapshot(): MissionCatalogSnapshot
  listLaunchable(trackId?: TrackId): readonly MissionDefinition[]
  get(trackId: TrackId, missionId: string): MissionDefinition | undefined
  runtimeUrl(mission: MissionDefinition): string
}

function configuredUrl(environmentKey: string): string | undefined {
  const value = (import.meta.env as Readonly<Record<string, unknown>>)[environmentKey]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export class GeneratedMissionCatalogRepository implements MissionCatalogRepository {
  snapshot(): MissionCatalogSnapshot {
    return missionCatalog
  }

  listLaunchable(trackId?: TrackId): readonly MissionDefinition[] {
    return missionCatalog.missions.filter(
      (mission) => trackId === undefined || mission.trackId === trackId,
    )
  }

  get(trackId: TrackId, missionId: string): MissionDefinition | undefined {
    return missionCatalog.missions.find(
      (mission) => mission.trackId === trackId && mission.id === missionId,
    )
  }

  runtimeUrl(mission: MissionDefinition): string {
    const base = configuredUrl(mission.runtime.environmentKey) ?? mission.runtime.entrypoint
    const url = new URL(base, window.location.href)
    url.searchParams.set('hosted', '1')
    url.searchParams.set('hostOrigin', window.location.origin)
    return url.toString()
  }
}
