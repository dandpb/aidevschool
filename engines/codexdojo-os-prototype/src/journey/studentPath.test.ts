import { describe, expect, it } from 'vitest'
import { missionCatalog } from '../data/missions'
import { GeneratedMissionCatalogRepository } from '../missions/catalog'
import { recommendMission } from '../missions/recommendation'
import { completeOnboarding, createInitialOsProgress, missionKey } from '../progress/domain'
import { migrateOsProgress } from '../progress/migration'
import { isAiPraticaChapterComplete, remapLegacyDevTrackProgress } from './studentPath'

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

  it('remaps legacy Dev pointers and keeps completed voxel status', () => {
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
        [missionKey('dev', 'game-02-warehouse')]: 'completed' as const,
      },
    }

    const { progress, changed } = remapLegacyDevTrackProgress(legacy, missionCatalog)

    expect(changed).toBe(true)
    expect(progress.onboarding.selectedTrackId).toBe('ai-pratica')
    expect(progress.activeTrackId).toBe('ai-pratica')
    expect(progress.missionStatusByKey[missionKey('dev', 'game-02-warehouse')]).toBe('completed')
  })

  it('recommends IA Prática on resume for migrated legacy Dev selection', () => {
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
      },
      missionCatalog,
    )

    expect(migrated.kind).toBe('migrated')
    expect(recommendMission(migrated.progress, catalog)).toEqual({
      kind: 'start',
      trackId: 'ai-pratica',
      missionId: 'l02',
    })
  })
})
