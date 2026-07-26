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
})
