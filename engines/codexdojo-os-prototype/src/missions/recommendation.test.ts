import { describe, expect, it } from 'vitest'
import { GeneratedMissionCatalogRepository } from './catalog'
import { recommendMission } from './recommendation'
import { learnerSnapshot } from '../data/learner'
import {
  completeOnboarding,
  createInitialOsProgress,
  missionKey,
  recordMissionAttempt,
  recordMissionCompletion,
  startMission,
} from '../progress/domain'
import { missionCatalog } from '../data/missions'
import type { LearnerSnapshot } from '../domain'

function learnerWith(overrides: Partial<LearnerSnapshot>): LearnerSnapshot {
  return { ...learnerSnapshot, ...overrides }
}

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

    const mission = missionCatalog.missions.find((candidate) => candidate.id === 'l02')
    if (mission === undefined) throw new Error('Expected pilot mission')
    expect(recommendMission(startMission(onboarded, mission), catalog)).toEqual({
      kind: 'resume',
      trackId: 'ai-pratica',
      missionId: 'l02',
    })
  })

  it('preserves the guided and intermediate l02 routes before normal chapter order', () => {
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    if (l02 === undefined) throw new Error('Expected l02')

    const guided = recordMissionCompletion(onboarded, l02, missionCatalog, 'l01')
    expect(recommendMission(guided, catalog)).toEqual({
      kind: 'start',
      trackId: 'ai-pratica',
      missionId: 'l01',
    })

    const intermediate = recordMissionCompletion(onboarded, l02, missionCatalog, 'l03')
    expect(recommendMission(intermediate, catalog)).toEqual({
      kind: 'start',
      trackId: 'ai-pratica',
      missionId: 'l03',
    })
  })

  it('unlocks the Dev chapter from declared prerequisites', () => {
    let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'build-systems',
      context: 'personal-project',
      confidence: 'high',
      selectedTrackId: 'dev',
    })
    const warehouse = missionCatalog.missions.find((mission) => mission.id === 'game-02-warehouse')
    const wormhole = missionCatalog.missions.find((mission) => mission.id === 'game-03-wormhole')
    if (warehouse === undefined || wormhole === undefined) throw new Error('Expected Dev chapter')

    expect(recommendMission(progress, catalog)).toMatchObject({ missionId: warehouse.id })
    progress = recordMissionCompletion(progress, warehouse, missionCatalog)
    expect(recommendMission(progress, catalog)).toMatchObject({ missionId: wormhole.id })
  })

  it('prioritizes only actionable canonical review reasons', () => {
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    const review = {
      unitId: 'ai-literacy:l02',
      title: 'IA não é uma fonte de verdade',
      dueIn: 'today',
    }

    expect(
      recommendMission(onboarded, catalog, {
        learner: { ...learnerSnapshot, nextReviews: [{ ...review, reason: 'due' }] },
      }),
    ).toMatchObject({ kind: 'review', reason: 'due', missionId: 'l02' })

    for (const reason of ['interleaving', 'recurring-trap'] as const) {
      expect(
        recommendMission(onboarded, catalog, {
          learner: { ...learnerSnapshot, nextReviews: [{ ...review, reason }] },
        }),
      ).toEqual({ kind: 'start', trackId: 'ai-pratica', missionId: 'l02' })
    }
  })

  it('applies resume, canonical review, retry, and new-content precedence', () => {
    const warehouse = missionCatalog.missions.find((mission) => mission.id === 'game-02-warehouse')
    const wormhole = missionCatalog.missions.find((mission) => mission.id === 'game-03-wormhole')
    if (warehouse === undefined || wormhole === undefined) throw new Error('Expected Dev missions')
    const canonical = learnerWith({
      nextReviews: [
        { unitId: warehouse.unitId, title: warehouse.title, dueIn: 'today', reason: 'due' },
      ],
      topPitfalls: [],
    })
    let progress = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'build-systems',
      context: 'personal-project',
      confidence: 'high',
      selectedTrackId: 'dev',
    })

    expect(
      recommendMission(startMission(progress, warehouse), catalog, { learner: canonical }),
    ).toMatchObject({
      kind: 'resume',
      missionId: warehouse.id,
    })

    progress = recordMissionCompletion(progress, warehouse, missionCatalog, undefined, {
      now: new Date('2026-07-25T10:00:00Z'),
    })
    expect(recommendMission(progress, catalog, { learner: canonical })).toMatchObject({
      kind: 'review',
      missionId: warehouse.id,
      reason: 'due',
    })

    const reviewKey = `${warehouse.unitId}:due:today`
    progress = recordMissionCompletion(
      startMission(progress, warehouse, { kind: 'review', canonicalReviewKey: reviewKey }),
      warehouse,
      missionCatalog,
      undefined,
      { now: new Date('2026-07-25T11:00:00Z') },
    )
    progress = recordMissionAttempt(progress, wormhole, {
      attemptId: 'wormhole-fail-1',
      passed: false,
      occurredAt: new Date('2026-07-25T12:00:00Z'),
    })
    expect(recommendMission(progress, catalog, { learner: canonical })).toMatchObject({
      kind: 'retry',
      missionId: wormhole.id,
      reason: 'failed-attempt',
    })
  })

  it('maps recurring pitfalls only after available chapter content is complete', () => {
    const l01 = missionCatalog.missions.find((mission) => mission.id === 'l01')
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    const l03 = missionCatalog.missions.find((mission) => mission.id === 'l03')
    if (l01 === undefined || l02 === undefined || l03 === undefined)
      throw new Error('Expected IA chapter')
    const canonical = learnerWith({
      nextReviews: [],
      topPitfalls: [
        {
          id: 'P-001',
          description: 'Reivindicar domínio cedo demais',
          occurrences: 3,
          lastSeen: '2026-07-25',
        },
      ],
    })
    const onboarded = completeOnboarding(createInitialOsProgress(missionCatalog), {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    expect(recommendMission(onboarded, catalog, { learner: canonical }).kind).toBe('start')

    let completed = recordMissionCompletion(onboarded, l02, missionCatalog, 'l03', {
      now: new Date('2026-07-25T10:00:00Z'),
    })
    expect(recommendMission(completed, catalog, { learner: canonical })).toEqual({
      kind: 'start',
      trackId: 'ai-pratica',
      missionId: 'l03',
    })

    completed = recordMissionCompletion(completed, l03, missionCatalog, undefined, {
      now: new Date('2026-07-25T10:05:00Z'),
    })
    completed = recordMissionCompletion(completed, l01, missionCatalog, undefined, {
      now: new Date('2026-07-25T10:10:00Z'),
    })
    expect(recommendMission(completed, catalog, { learner: canonical })).toEqual({
      kind: 'targeted-practice',
      trackId: 'ai-pratica',
      missionId: 'l02',
      pitfallId: 'P-001',
    })
  })

  it('directs rejected evidence to recovery before new content', () => {
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
    expect(
      recommendMission(progress, catalog, {
        learner: learnerWith({ nextReviews: [], topPitfalls: [] }),
        verificationByKey: {
          [missionKey('ai-pratica', 'l02')]: { kind: 'rejected' as const, code: 'digest-mismatch' },
        },
      }),
    ).toMatchObject({ kind: 'retry', missionId: 'l02', reason: 'rejected-evidence' })
  })
})
