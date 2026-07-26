import { describe, expect, it } from 'vitest'
import { missionCatalog } from '../data/missions'
import {
  completeOnboarding,
  createInitialOsProgress,
  missionKey,
  recordMissionCompletion,
  startMission,
} from './domain'

describe('OS local progress', () => {
  it('persists only local mission states and cannot represent mastery', () => {
    const mission = missionCatalog.missions[0]
    if (mission === undefined) throw new Error('Expected pilot mission')
    const initial = createInitialOsProgress(missionCatalog)
    const onboarded = completeOnboarding(initial, {
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'ai-pratica',
    })

    const started = startMission(onboarded, mission)
    const completed = recordMissionCompletion(started, mission)

    expect(started.missionStatusByKey[missionKey('ai-pratica', 'l02')]).toBe('in_progress')
    expect(completed.missionStatusByKey[missionKey('ai-pratica', 'l02')]).toBe('completed')
    expect(JSON.stringify(completed)).not.toContain('mastered')
    expect(JSON.stringify(completed)).not.toContain('verified')
  })
})
