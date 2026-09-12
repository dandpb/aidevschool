import { describe, expect, it } from 'vitest'
import { GeneratedMissionCatalogRepository } from './catalog'
import { recommendMission } from './recommendation'
import { learnerSnapshot } from '../data/learner'
import {
  completeOnboarding,
  createInitialOsProgress,
  missionKey,
  recordMissionCompletion,
} from '../progress/domain'
import { missionCatalog } from '../data/missions'
import type { LearnerSnapshot } from '../domain'
import type { MissionDefinition } from '../domain'

function learnerWith(overrides: Partial<LearnerSnapshot>): LearnerSnapshot {
  return { ...learnerSnapshot, ...overrides }
}

function completeAllLaunchable(
  progress: ReturnType<typeof createInitialOsProgress>,
  catalog: GeneratedMissionCatalogRepository,
  trackId: MissionDefinition['trackId'],
  skipMissionId?: string,
) {
  let next = progress
  for (const mission of catalog.listLaunchable(trackId)) {
    if (mission.id === skipMissionId) continue
    if (next.missionStatusByKey[missionKey(trackId, mission.id)] === 'completed') continue
    next = recordMissionCompletion(next, mission, missionCatalog)
  }
  return next
}

describe('forward-over-recovery recommendation precedence', () => {
  const catalog = new GeneratedMissionCatalogRepository()

  it('continues forward when a completed mission has rejected evidence but the next mission is available', () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')
    const progress = recordMissionCompletion(
      completeOnboarding(createInitialOsProgress(missionCatalog), {
        goal: 'work-better',
        context: 'work',
        confidence: 'low',
        selectedTrackId: 'ai-pratica',
      }),
      l02,
      missionCatalog,
      'l03',
      { now: new Date('2026-07-25T10:00:00Z') },
    )
    expect(recommendMission(progress, catalog, {
      learner: learnerWith({ nextReviews: [], topPitfalls: [] }),
      verificationByKey: {
        [missionKey('ai-pratica', 'l02')]: { kind: 'rejected' as const, code: 'digest-mismatch' },
      },
    })).toMatchObject({ kind: 'start', trackId: 'ai-pratica', missionId: 'l03' })
  })

  it('directs rejected evidence to recovery when no forward mission remains on IA Prática', () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    const progress = completeAllLaunchable(
      recordMissionCompletion(onboarded, l02, missionCatalog, 'l03', {
        now: new Date('2026-07-25T10:00:00Z'),
      }),
      catalog,
      'ai-pratica',
    )
    expect(recommendMission(progress, catalog, {
      learner: learnerWith({ nextReviews: [], topPitfalls: [] }),
      verificationByKey: {
        [missionKey('ai-pratica', 'l02')]: { kind: 'rejected' as const, code: 'digest-mismatch' },
      },
    })).toMatchObject({ kind: 'retry', trackId: 'ai-pratica', missionId: 'l02', reason: 'rejected-evidence' })
  })

  it('continues forward on Dev when a completed mission has rejected evidence but later missions are still available', () => {
    const warehouse = missionCatalog.missions.find((mission) => mission.id === 'game-02-warehouse')
    if (warehouse === undefined) throw new Error('Expected warehouse mission')
    const progress = recordMissionCompletion(
      completeOnboarding(createInitialOsProgress(missionCatalog), {
        goal: 'build-systems',
        context: 'personal-project',
        confidence: 'high',
        selectedTrackId: 'dev',
      }),
      warehouse,
      missionCatalog,
      undefined,
      { now: new Date('2026-07-25T10:00:00Z') },
    )
    expect(recommendMission(progress, catalog, {
      learner: learnerWith({ nextReviews: [], topPitfalls: [] }),
      verificationByKey: {
        [missionKey('dev', 'game-02-warehouse')]: { kind: 'rejected' as const, code: 'digest-mismatch' },
      },
    })).toMatchObject({ kind: 'start', trackId: 'dev', missionId: 'game-03-wormhole' })
  })

  it('directs rejected evidence to recovery on Dev when every launchable mission is completed', () => {
    const warehouse = missionCatalog.missions.find((mission) => mission.id === 'game-02-warehouse')
    if (warehouse === undefined) throw new Error('Expected warehouse mission')
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'build-systems',
      context: 'personal-project',
      confidence: 'high',
      selectedTrackId: 'dev',
    })
    const progress = completeAllLaunchable(onboarded, catalog, 'dev')
    expect(recommendMission(progress, catalog, {
      learner: learnerWith({ nextReviews: [], topPitfalls: [] }),
      verificationByKey: {
        [missionKey('dev', 'game-02-warehouse')]: { kind: 'rejected' as const, code: 'digest-mismatch' },
      },
    })).toMatchObject({
      kind: 'retry',
      trackId: 'dev',
      missionId: 'game-02-warehouse',
      reason: 'rejected-evidence',
    })
  })
})
