import { useCallback, useEffect, useReducer } from 'react'
import { encodeRoute, parseRoute } from '../app/routes'
import type { MissionDefinition } from '../domain'
import { migrateOsProgress } from '../progress/migration'
import {
  type OnboardingInput,
  completeOnboarding,
  recordMissionCompletion,
  startMission,
} from '../progress/domain'
import { useServices } from '../app/ServicesProvider'
import { journeyReducer } from './journeyReducer'

export function useJourneyController() {
  const services = useServices()
  const [state, dispatch] = useReducer(journeyReducer, {
    kind: 'booting',
    route: parseRoute(services.navigation.currentPath()),
  })

  useEffect(() => {
    return services.navigation.subscribe((path) => {
      dispatch({ type: 'ROUTE_CHANGED', route: parseRoute(path) })
    })
  }, [services])

  useEffect(() => {
    let ignore = false
    void (async () => {
      try {
        const migration = migrateOsProgress(
          await services.progress.load(),
          services.missions.snapshot(),
        )
        if (migration.kind === 'reset') await services.progress.save(migration.progress)
        if (ignore) return
        let route = parseRoute(services.navigation.currentPath())
        if (route.kind === 'boot') {
          route = migration.progress.onboarding.completed
            ? { kind: 'hub' }
            : { kind: 'onboarding', step: 'profile' }
          services.navigation.replace(encodeRoute(route))
        } else if (!migration.progress.onboarding.completed && route.kind !== 'onboarding') {
          route = { kind: 'onboarding', step: 'profile' }
          services.navigation.replace('/onboarding')
        }
        dispatch({
          type: 'LOADED',
          route,
          progress: migration.progress,
          ...(migration.kind === 'reset' && migration.reason !== 'first-run'
            ? { resetReason: migration.reason }
            : {}),
        })
      } catch (error) {
        if (!ignore) {
          dispatch({
            type: 'FAILED',
            message: error instanceof Error ? error.message : 'Não foi possível abrir a jornada.',
          })
        }
      }
    })()
    return () => {
      ignore = true
    }
  }, [services])

  const saveProgress = useCallback(
    async (progress: Parameters<typeof services.progress.save>[0]) => {
      await services.progress.save(progress)
      dispatch({ type: 'PROGRESS_SAVED', progress })
    },
    [services],
  )

  const finishOnboarding = useCallback(
    async (input: OnboardingInput) => {
      if (state.kind !== 'ready') return
      const progress = completeOnboarding(state.progress, input)
      await saveProgress(progress)
      services.navigation.push('/hub')
    },
    [saveProgress, services, state],
  )

  const launchMission = useCallback(
    async (mission: MissionDefinition) => {
      if (state.kind !== 'ready') return
      const progress = startMission(state.progress, mission)
      await saveProgress(progress)
      services.navigation.push(encodeRoute({ kind: 'mission', trackId: mission.trackId, missionId: mission.id }))
    },
    [saveProgress, services, state],
  )

  const completeMission = useCallback(
    async (mission: MissionDefinition) => {
      if (state.kind !== 'ready') return
      await saveProgress(recordMissionCompletion(state.progress, mission))
    },
    [saveProgress, state],
  )

  return { state, finishOnboarding, launchMission, completeMission }
}
