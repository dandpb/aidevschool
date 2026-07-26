import { useCallback, useEffect, useReducer } from 'react'
import { emitAnalyticsSafely } from '../analytics/events'
import { encodeRoute, parseRoute } from '../app/routes'
import type { MissionDefinition } from '../domain'
import { migrateOsProgress } from '../progress/migration'
import {
  type MissionStartOptions,
  type OnboardingInput,
  completeOnboarding,
  recommendTrack,
  recordMissionCompletion,
  startMission,
  switchTrack,
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
        const rawProgress = await services.progress.load()
        const migration = migrateOsProgress(
          rawProgress,
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
        if (route.kind === 'onboarding') {
          emitAnalyticsSafely(services.analytics, { name: 'onboarding.started' })
        } else if (route.kind === 'hub' && rawProgress !== null) {
          emitAnalyticsSafely(services.analytics, { name: 'journey.returned' })
        }
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
      emitAnalyticsSafely(services.analytics, {
        name: 'onboarding.completed',
        dimensions: {
          recommendationChanged: recommendTrack(input) !== input.selectedTrackId,
        },
        context: { trackId: input.selectedTrackId },
      })
      services.navigation.push('/hub')
    },
    [saveProgress, services, state],
  )

  const launchMission = useCallback(
    async (mission: MissionDefinition, options: MissionStartOptions = {}) => {
      if (state.kind !== 'ready') return
      const progress = startMission(state.progress, mission, options)
      await saveProgress(progress)
      if (options.kind === 'review') {
        emitAnalyticsSafely(services.analytics, {
          name: 'review.started',
          dimensions: { reason: 'canonical-review' },
          context: { trackId: mission.trackId, missionId: mission.id },
        })
      } else if (options.kind === 'retry' || options.kind === 'targeted-practice') {
        emitAnalyticsSafely(services.analytics, {
          name: 'retry.requested',
          dimensions: { reason: options.kind },
          context: { trackId: mission.trackId, missionId: mission.id },
        })
      }
      services.navigation.push(encodeRoute({ kind: 'mission', trackId: mission.trackId, missionId: mission.id }))
    },
    [saveProgress, services, state],
  )

  const completeMission = useCallback(
    async (mission: MissionDefinition, preferredNextMissionId?: string) => {
      if (state.kind !== 'ready') return
      const completed = recordMissionCompletion(
        state.progress,
        mission,
        services.missions.snapshot(),
        preferredNextMissionId,
        { now: services.clock() },
      )
      await saveProgress(completed)
      const previousAchievements = new Set(state.progress.achievements.map((achievement) => achievement.id))
      return {
        xpAwarded: completed.xp - state.progress.xp,
        totalXp: completed.xp,
        achievementsUnlocked: completed.achievements
          .filter((achievement) => !previousAchievements.has(achievement.id))
          .map((achievement) => achievement.id),
      }
    },
    [saveProgress, services, state],
  )

  const selectTrack = useCallback(
    async (trackId: MissionDefinition['trackId']) => {
      if (state.kind !== 'ready') return
      await saveProgress(switchTrack(state.progress, trackId, services.missions.snapshot()))
    },
    [saveProgress, services, state],
  )

  return { state, finishOnboarding, launchMission, completeMission, selectTrack }
}
