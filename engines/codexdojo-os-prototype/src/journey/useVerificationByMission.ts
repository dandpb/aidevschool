import { useCallback, useEffect, useState } from 'react'
import type { MissionDefinition, MissionKey } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import { missionKey } from '../progress/domain'
import type { EvidenceVerificationState, VerificationService } from '../verification/ports'

type VerificationAvailability = 'loading' | 'available' | 'unavailable'

type VerificationLoad = {
  readonly availability: VerificationAvailability
  readonly verificationByKey: Partial<Record<MissionKey, EvidenceVerificationState>>
}

const loading: VerificationLoad = { availability: 'loading', verificationByKey: {} }

export function useVerificationByMission(
  catalog: MissionCatalogRepository,
  verification: VerificationService,
) {
  const [load, setLoad] = useState<VerificationLoad>(loading)

  useEffect(() => {
    let cancelled = false
    setLoad(loading)
    void Promise.all(
      catalog.listLaunchable().map(async (mission) => [
        missionKey(mission.trackId, mission.id),
        await verification.latest(mission),
      ] as const),
    ).then((entries) => {
      if (!cancelled) {
        setLoad({ availability: 'available', verificationByKey: Object.fromEntries(entries) })
      }
    }).catch(() => {
      if (!cancelled) {
        setLoad({ availability: 'unavailable', verificationByKey: {} })
      }
    })
    return () => { cancelled = true }
  }, [catalog, verification])

  const setVerification = useCallback((mission: MissionDefinition, state: EvidenceVerificationState) => {
    const key = missionKey(mission.trackId, mission.id)
    setLoad((current) => ({
      ...current,
      verificationByKey: { ...current.verificationByKey, [key]: state },
    }))
  }, [])

  return { ...load, setVerification }
}
