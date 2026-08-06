import { useState } from 'react'
import { type AppServices, createServices } from './app/createServices'
import { parseRoute } from './app/routes'
import { ServicesProvider } from './app/ServicesProvider'
import { DesktopApp } from './desktop/DesktopApp'
import type { LearnerSnapshot } from './domain'
import { JourneyApp } from './journey/JourneyApp'

export type AppProps = {
  readonly learner?: LearnerSnapshot
  readonly services?: AppServices
}

export function App({ learner, services }: AppProps) {
  const [resolvedServices] = useState(() => services ?? createServices())
  const route = parseRoute(resolvedServices.navigation.currentPath())
  if (route.kind === 'desktop') return <DesktopApp learner={learner} />
  return (
    <ServicesProvider services={resolvedServices}>
      <JourneyApp learner={learner} />
    </ServicesProvider>
  )
}

export default App
