import { describe, expect, it } from 'vitest'
import { GeneratedMissionCatalogRepository } from './catalog'
import { recommendMission } from './recommendation'
import {
  completeOnboarding,
  createInitialOsProgress,
  startMission,
} from '../progress/domain'
import { missionCatalog } from '../data/missions'

describe('initial mission recommendation', () => {
  const catalog = new GeneratedMissionCatalogRepository()

  it('prioritizes onboarding, then the first available mission, then resume', () => {
    const initial = createInitialOsProgress(missionCatalog)
    expect(recommendMission(initial, catalog)).toEqual({ kind: 'onboarding' })

    const onboarded = completeOnboarding(initial, {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    expect(recommendMission(onboarded, catalog)).toEqual({
      kind: 'start',
      trackId: 'ai-pratica',
      missionId: 'l02',
    })

    const mission = missionCatalog.missions[0]
    if (mission === undefined) throw new Error('Expected pilot mission')
    expect(recommendMission(startMission(onboarded, mission), catalog)).toEqual({
      kind: 'resume',
      trackId: 'ai-pratica',
      missionId: 'l02',
    })
  })
})
