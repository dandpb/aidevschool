import { useServices } from '../app/ServicesProvider'
import { learnerSnapshot } from '../data/learner'
import type { LearnerSnapshot } from '../domain'
import { MissionShell } from '../host/MissionShell'
import { Hub } from './Hub'
import { MapScreen } from './MapScreen'
import { Onboarding } from './Onboarding'
import { ProgressScreen } from './ProgressScreen'
import { useJourneyController } from './useJourneyController'

export function JourneyApp({ learner = learnerSnapshot }: { readonly learner?: LearnerSnapshot }) {
  const services = useServices()
  const controller = useJourneyController()
  const { state } = controller

  if (state.kind === 'booting') {
    return <main className="journey-loading" aria-busy="true">Preparando sua jornada…</main>
  }
  if (state.kind === 'failed') {
    return <main className="journey-loading" role="alert">{state.message}</main>
  }

  const { route, progress } = state
  if (route.kind === 'onboarding' || route.kind === 'boot') {
    return <Onboarding initialTrackId={controller.requestedTrackId} onComplete={(input) => void controller.finishOnboarding(input)} />
  }
  if (route.kind === 'hub') {
    return (
      <Hub
        progress={progress}
        learner={learner}
        catalog={services.missions}
        onLaunch={(mission, options) => void controller.launchMission(mission, options)}
        onOpenMap={() => services.navigation.push('/map')}
        onOpenProgress={() => services.navigation.push('/progress')}
      />
    )
  }
  if (route.kind === 'mission') {
    const mission = services.missions.get(route.trackId, route.missionId)
    if (mission === undefined) {
      return <main className="journey-loading" role="alert">Esta missão não está disponível.</main>
    }
    return (
      <MissionShell
        mission={mission}
        learner={learner}
        onComplete={controller.completeMission}
        onReturn={() => services.navigation.push('/hub')}
      />
    )
  }
  if (route.kind === 'map') {
    return (
      <MapScreen
        progress={progress}
        learner={learner}
        catalog={services.missions}
        onLaunch={(mission) => void controller.launchMission(mission)}
        onBack={() => services.navigation.push('/hub')}
      />
    )
  }
  if (route.kind === 'progress') {
    return (
      <ProgressScreen
        progress={progress}
        learner={learner}
        catalog={services.missions}
        onBack={() => services.navigation.push('/hub')}
      />
    )
  }
  return <main className="journey-loading" role="alert">Rota não encontrada.</main>
}
