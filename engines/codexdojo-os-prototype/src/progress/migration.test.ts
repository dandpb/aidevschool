import { describe, expect, it } from 'vitest'
import { missionCatalog } from '../data/missions'
import { createInitialOsProgress, missionKey } from './domain'
import { migrateOsProgress } from './migration'

describe('OS progress migration', () => {
  it('fails recoverably for malformed and future state', () => {
    expect(migrateOsProgress({ schemaVersion: 99 }, missionCatalog)).toMatchObject({
      kind: 'reset',
      reason: 'future-schema-version',
    })
    expect(migrateOsProgress({ schemaVersion: 1, onboarding: {} }, missionCatalog)).toMatchObject({
      kind: 'reset',
      reason: 'malformed-state',
    })
  })

  it('preserves stable completed mission IDs while reconciling catalog state', () => {
    const raw = createInitialOsProgress(missionCatalog)
    const key = missionKey('ai-pratica', 'l02')
    const migrated = migrateOsProgress(
      { ...raw, missionStatusByKey: { ...raw.missionStatusByKey, [key]: 'completed' } },
      missionCatalog,
    )

    expect(migrated.kind).toBe('loaded')
    expect(migrated.progress.missionStatusByKey[key]).toBe('completed')
  })

  it('migrates version 2 engagement fields sequentially with safe defaults', () => {
    const current = createInitialOsProgress(missionCatalog)
    const {
      xp: _xp,
      dailyGoalXp: _dailyGoalXp,
      dailyXpByLocalDate: _dailyXp,
      localEngagementStreak: _streak,
      achievements: _achievements,
      missionEngagementByKey: _engagement,
      rewardedActivityKeys: _rewards,
      ...legacy
    } = current
    const migrated = migrateOsProgress({ ...legacy, schemaVersion: 2 }, missionCatalog)

    expect(migrated.kind).toBe('loaded')
    expect(migrated.progress.schemaVersion).toBe(3)
    expect(migrated.progress.xp).toBe(0)
    expect(migrated.progress.localEngagementStreak).toEqual({
      current: 0,
      longest: 0,
      lastActiveLocalDate: null,
    })
    expect(Object.keys(migrated.progress.missionEngagementByKey)).toHaveLength(6)
  })

  it('adds new IDs, drops removed IDs, and resets incompatible in-progress versions', () => {
    const raw = createInitialOsProgress(missionCatalog)
    const l02Key = missionKey('ai-pratica', 'l02')
    const removedKey = missionKey('dev', 'game-99-removed')
    const changedCatalog = {
      ...missionCatalog,
      missions: missionCatalog.missions.map((mission) =>
        mission.id === 'l02' ? { ...mission, version: mission.version + 1 } : mission,
      ),
    }
    const migrated = migrateOsProgress(
      {
        ...raw,
        activeTrackId: 'ai-pratica',
        activeMissionId: 'l02',
        missionStatusByKey: {
          ...raw.missionStatusByKey,
          [l02Key]: 'in_progress',
          [removedKey]: 'completed',
        },
        missionVersionsByKey: { ...raw.missionVersionsByKey, [removedKey]: 1 },
      },
      changedCatalog,
    )

    expect(migrated.kind).toBe('loaded')
    expect(migrated.progress.missionStatusByKey[l02Key]).toBe('available')
    expect(migrated.progress.missionStatusByKey).not.toHaveProperty(removedKey)
    expect(migrated.progress.activeMissionId).toBe('l02')
  })
})
