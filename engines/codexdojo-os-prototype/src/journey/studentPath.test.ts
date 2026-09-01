import { describe, expect, it } from 'vitest'
import { missionCatalog } from '../data/missions'
import { GeneratedMissionCatalogRepository } from '../missions/catalog'
import { recommendMission } from '../missions/recommendation'
import { completeOnboarding, createInitialOsProgress, missionKey } from '../progress/domain'
import { migrateOsProgress } from '../progress/migration'
import {
  AI_PRATICA_GUIDED_RAIL_MISSION_IDS,
  DEV_GUIDED_RAIL_MISSION_IDS,
  isAiPraticaChapterComplete,
  listStudentRailMissions,
  remapLegacyDevTrackProgress,
  requestedTrackIdFromSearch,
} from './studentPath'

describe('student path remapping', () => {
  const catalog = new GeneratedMissionCatalogRepository()

  it('detects incomplete IA Prática before hosted simulations', () => {
    const progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })

    expect(isAiPraticaChapterComplete(progress, missionCatalog)).toBe(false)
  })


  it('marks IA Prática complete after only the l01-l03 rail', () => {
    const raw = createInitialOsProgress(missionCatalog)
    const progress = {
      ...completeOnboarding(raw, {
        goal: 'work-better',
        context: 'work',
        confidence: 'low',
        selectedTrackId: 'ai-pratica',
      }),
      missionStatusByKey: {
        ...raw.missionStatusByKey,
        [missionKey('ai-pratica', 'l01')]: 'completed' as const,
        [missionKey('ai-pratica', 'l02')]: 'completed' as const,
        [missionKey('ai-pratica', 'l03')]: 'completed' as const,
      },
    }

    expect(isAiPraticaChapterComplete(progress, missionCatalog)).toBe(true)
    expect(progress.missionStatusByKey[missionKey('ai-pratica', 'l04')]).not.toBe('completed')
  })

  it('does not remap Dev selection and keeps completed literacy and voxel status', () => {
    const raw = createInitialOsProgress(missionCatalog)
    const legacy = {
      ...completeOnboarding(raw, {
        goal: 'build-systems',
        context: 'personal-project',
        confidence: 'high',
        selectedTrackId: 'dev',
      }),
      activeTrackId: 'dev' as const,
      activeMissionId: 'game-02-warehouse',
      missionStatusByKey: {
        ...raw.missionStatusByKey,
        [missionKey('ai-pratica', 'l01')]: 'completed' as const,
        [missionKey('ai-pratica', 'l02')]: 'completed' as const,
        [missionKey('ai-pratica', 'l03')]: 'completed' as const,
        [missionKey('dev', 'game-02-warehouse')]: 'completed' as const,
      },
    }

    const { progress, changed } = remapLegacyDevTrackProgress(legacy, missionCatalog)

    expect(changed).toBe(false)
    expect(progress.onboarding.selectedTrackId).toBe('dev')
    expect(progress.activeTrackId).toBe('dev')
    expect(progress.missionStatusByKey[missionKey('ai-pratica', 'l01')]).toBe('completed')
    expect(progress.missionStatusByKey[missionKey('ai-pratica', 'l02')]).toBe('completed')
    expect(progress.missionStatusByKey[missionKey('ai-pratica', 'l03')]).toBe('completed')
    expect(progress.missionStatusByKey[missionKey('dev', 'game-02-warehouse')]).toBe('completed')
  })

  it('keeps Dev on resume so the learner can choose it again without a wipe', () => {
    const raw = createInitialOsProgress(missionCatalog)
    const legacy = completeOnboarding(raw, {
      goal: 'build-systems',
      context: 'personal-project',
      confidence: 'high',
      selectedTrackId: 'dev',
    })
    const migrated = migrateOsProgress(
      {
        ...legacy,
        activeTrackId: 'dev',
        activeMissionId: 'game-02-warehouse',
        missionStatusByKey: {
          ...raw.missionStatusByKey,
          [missionKey('ai-pratica', 'l01')]: 'completed',
          [missionKey('ai-pratica', 'l02')]: 'completed',
          [missionKey('ai-pratica', 'l03')]: 'completed',
        },
      },
      missionCatalog,
    )

    expect(migrated.kind).toBe('loaded')
    expect(migrated.progress.onboarding.selectedTrackId).toBe('dev')
    expect(recommendMission(migrated.progress, catalog)).toEqual({
      kind: 'start',
      trackId: 'dev',
      missionId: 'game-02-warehouse',
    })
  })

  it('limits the public Dev rail to WAREHOUSE, WORMHOLE and RELAY STATION', () => {
    const rail = listStudentRailMissions(catalog, 'dev')
    expect(rail.map((mission) => mission.id)).toEqual([...DEV_GUIDED_RAIL_MISSION_IDS])
    expect(rail.some((mission) => mission.id.startsWith('l1'))).toBe(false)
    expect(rail.some((mission) => mission.id === 'game-06-pipeline-plant')).toBe(false)
  })

  it('limits the public IA Prática rail to l01-l03, not the full catalog', () => {
    const rail = listStudentRailMissions(catalog, 'ai-pratica')
    expect(rail.map((mission) => mission.id)).toEqual([...AI_PRATICA_GUIDED_RAIL_MISSION_IDS])
    expect(rail.some((mission) => mission.id === 'l04')).toBe(false)
    expect(listStudentRailMissions(catalog)).toHaveLength(6)
  })

  it('reads ?track=dev from the search string', () => {
    expect(requestedTrackIdFromSearch('?track=dev')).toBe('dev')
    expect(requestedTrackIdFromSearch('?track=ai-pratica')).toBe('ai-pratica')
    expect(requestedTrackIdFromSearch('')).toBeUndefined()
  })
})
