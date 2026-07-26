import { describe, expect, it } from 'vitest'
import { missionCatalog } from '../data/missions'
import {
  MISSION_COMPLETION_XP,
  REVIEW_PRACTICE_XP,
  completeOnboarding,
  createInitialOsProgress,
  dailyGoalMet,
  dailyXp,
  missionKey,
  recordHintRequest,
  recordMissionAttempt,
  recordMissionCompletion,
  startMission,
  switchTrack,
} from './domain'

describe('OS local progress', () => {
  it('persists only local mission states and cannot represent mastery', () => {
    const mission = missionCatalog.missions.find((candidate) => candidate.id === 'l02')
    if (mission === undefined) throw new Error('Expected pilot mission')
    const initial = createInitialOsProgress(missionCatalog)
    const onboarded = completeOnboarding(initial, {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })

    const started = startMission(onboarded, mission)
    const completed = recordMissionCompletion(started, mission, missionCatalog, undefined, {
      now: new Date('2026-07-25T10:00:00-03:00'),
    })

    expect(started.missionStatusByKey[missionKey('ai-pratica', 'l02')]).toBe('in_progress')
    expect(completed.missionStatusByKey[missionKey('ai-pratica', 'l02')]).toBe('completed')
    expect(JSON.stringify(completed)).not.toContain('mastered')
    expect(JSON.stringify(completed)).not.toContain('verified')
  })

  it('awards completion and review XP idempotently without repeat inflation', () => {
    const mission = missionCatalog.missions.find((candidate) => candidate.id === 'l02')
    if (mission === undefined) throw new Error('Expected l02')
    const now = new Date('2026-07-25T10:00:00-03:00')
    const initial = createInitialOsProgress(missionCatalog)
    const completed = recordMissionCompletion(initial, mission, missionCatalog, undefined, { now })
    const duplicate = recordMissionCompletion(completed, mission, missionCatalog, undefined, { now })

    expect(completed.xp).toBe(MISSION_COMPLETION_XP)
    expect(duplicate.xp).toBe(MISSION_COMPLETION_XP)
    expect(dailyXp(completed, now)).toBe(MISSION_COMPLETION_XP)
    expect(dailyGoalMet(completed, now)).toBe(true)

    const reviewKey = 'ai-literacy:l02:due:today'
    const reviewStarted = startMission(duplicate, mission, { kind: 'review', canonicalReviewKey: reviewKey })
    const reviewed = recordMissionCompletion(reviewStarted, mission, missionCatalog, undefined, { now })
    const duplicateReview = recordMissionCompletion(
      startMission(reviewed, mission, { kind: 'review', canonicalReviewKey: reviewKey }),
      mission,
      missionCatalog,
      undefined,
      { now },
    )
    expect(reviewed.xp).toBe(MISSION_COMPLETION_XP + REVIEW_PRACTICE_XP)
    expect(duplicateReview.xp).toBe(reviewed.xp)
    expect(reviewed.missionEngagementByKey[missionKey('ai-pratica', 'l02')].completedReviewKeys).toContain(reviewKey)
  })

  it('tracks attempts and hints by id while keeping retry metadata local', () => {
    const mission = missionCatalog.missions.find((candidate) => candidate.id === 'l02')
    if (mission === undefined) throw new Error('Expected l02')
    const initial = createInitialOsProgress(missionCatalog)
    const attempted = recordMissionAttempt(initial, mission, {
      attemptId: 'attempt-1',
      passed: false,
      hintsUsed: 2,
      occurredAt: new Date('2026-07-25T10:00:00Z'),
    })
    const duplicate = recordMissionAttempt(attempted, mission, {
      attemptId: 'attempt-1',
      passed: false,
      hintsUsed: 2,
      occurredAt: new Date('2026-07-25T10:00:00Z'),
    })
    const hinted = recordHintRequest(recordHintRequest(duplicate, mission, 'hint-1'), mission, 'hint-1')
    const engagement = hinted.missionEngagementByKey[missionKey('ai-pratica', 'l02')]

    expect(engagement.attempts).toBe(1)
    expect(engagement.hintsRequested).toBe(3)
    expect(engagement.retryRecommended).toBe(true)
    expect(JSON.stringify(hinted)).not.toContain('mastered')
  })

  it('uses local calendar days for streak continuation and gap recovery', () => {
    const l01 = missionCatalog.missions.find((mission) => mission.id === 'l01')
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    const l03 = missionCatalog.missions.find((mission) => mission.id === 'l03')
    if (l01 === undefined || l02 === undefined || l03 === undefined) throw new Error('Expected IA chapter')
    let progress = createInitialOsProgress(missionCatalog)
    progress = recordMissionCompletion(progress, l01, missionCatalog, undefined, {
      now: new Date('2026-07-25T23:30:00-03:00'),
    })
    progress = recordMissionCompletion(progress, l02, missionCatalog, undefined, {
      now: new Date('2026-07-26T08:00:00-03:00'),
    })
    expect(progress.localEngagementStreak.current).toBe(2)

    progress = recordMissionCompletion(progress, l03, missionCatalog, undefined, {
      now: new Date('2026-07-29T08:00:00-03:00'),
    })
    expect(progress.localEngagementStreak.current).toBe(1)
    expect(progress.localEngagementStreak.longest).toBe(2)
    expect(progress.achievements.map((achievement) => achievement.id)).toEqual(expect.arrayContaining([
      'first-mission',
      'first-practice',
      'ai-pratica-started',
      'three-missions',
    ]))
  })

  it('unlocks prerequisites and preserves each track while switching', () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    const warehouse = missionCatalog.missions.find((mission) => mission.id === 'game-02-warehouse')
    if (l02 === undefined || warehouse === undefined) throw new Error('Expected entry missions')
    let progress = createInitialOsProgress(missionCatalog)
    progress = completeOnboarding(progress, {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })
    progress = recordMissionCompletion(progress, l02, missionCatalog, 'l03')
    expect(progress.missionStatusByKey[missionKey('ai-pratica', 'l03')]).toBe('available')

    progress = switchTrack(progress, 'dev', missionCatalog)
    progress = recordMissionCompletion(progress, warehouse, missionCatalog)
    expect(progress.missionStatusByKey[missionKey('dev', 'game-03-wormhole')]).toBe('available')

    progress = switchTrack(progress, 'ai-pratica', missionCatalog)
    expect(progress.missionStatusByKey[missionKey('ai-pratica', 'l02')]).toBe('completed')
    expect(progress.missionStatusByKey[missionKey('dev', 'game-02-warehouse')]).toBe('completed')
    expect(progress.onboarding.selectedTrackId).toBe('ai-pratica')
  })
})
