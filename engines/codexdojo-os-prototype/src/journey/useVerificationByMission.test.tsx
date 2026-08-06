import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { missionCatalog } from '../data/missions'
import type { MissionDefinition, TrackId } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import type { EvidenceVerificationState, VerificationService } from '../verification/ports'
import { useVerificationByMission } from './useVerificationByMission'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function catalog(missions: readonly MissionDefinition[]): MissionCatalogRepository {
  return {
    snapshot: () => missionCatalog,
    listLaunchable: (trackId?: TrackId) =>
      missions.filter((mission) => trackId === undefined || mission.trackId === trackId),
    get: (trackId, missionId) =>
      missions.find((mission) => mission.trackId === trackId && mission.id === missionId),
    runtimeUrl: () => 'http://localhost/',
  }
}

const noSubmission = { kind: 'not-submitted' } as const

describe('useVerificationByMission', () => {
  it('ignores a completed request after the catalog changes', async () => {
    const l02 = missionCatalog.missions.find((mission) => mission.id === 'l02')
    const l03 = missionCatalog.missions.find((mission) => mission.id === 'l03')
    if (l02 === undefined || l03 === undefined) throw new Error('Expected journey missions')
    const first = deferred<EvidenceVerificationState>()
    const second = deferred<EvidenceVerificationState>()
    const verification = {
      accept: async () => noSubmission,
      retry: async () => noSubmission,
      latest: vi.fn((mission: MissionDefinition) =>
        mission.id === 'l02' ? first.promise : second.promise,
      ),
    } satisfies VerificationService
    const { result, rerender } = renderHook(
      ({ currentCatalog }) => useVerificationByMission(currentCatalog, verification),
      { initialProps: { currentCatalog: catalog([l02]) } },
    )

    await waitFor(() => expect(verification.latest).toHaveBeenCalledWith(l02))
    rerender({ currentCatalog: catalog([l03]) })
    await waitFor(() => expect(verification.latest).toHaveBeenCalledWith(l03))
    await act(async () => {
      second.resolve(noSubmission)
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.availability).toBe('available'))

    await act(async () => {
      first.resolve(noSubmission)
      await Promise.resolve()
    })

    expect(result.current.verificationByKey['ai-pratica:l03']).toEqual(noSubmission)
    expect(result.current.verificationByKey['ai-pratica:l02']).toBeUndefined()
  })

  it('reports repository failure while preserving the safe empty state', async () => {
    const verification = {
      accept: async () => noSubmission,
      retry: async () => noSubmission,
      latest: async () => {
        throw new Error('verification repository unavailable')
      },
    } satisfies VerificationService
    const { result } = renderHook(() =>
      useVerificationByMission(catalog(missionCatalog.missions), verification),
    )

    await waitFor(() => expect(result.current.availability).toBe('unavailable'))
    expect(result.current.verificationByKey).toEqual({})
  })
})
