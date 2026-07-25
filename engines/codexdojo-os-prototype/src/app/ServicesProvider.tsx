import { createContext, type ReactNode, useContext } from 'react'
import type { AppServices } from './createServices'

const ServicesContext = createContext<AppServices | null>(null)

export function ServicesProvider({
  services,
  children,
}: {
  readonly services: AppServices
  readonly children: ReactNode
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext)
  if (services === null) throw new Error('ServicesProvider is required')
  return services
}
