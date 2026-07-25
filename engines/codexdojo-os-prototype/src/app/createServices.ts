import { BrowserNavigation, type NavigationPort } from './routes'
import { MissionSessionController, type MissionSessionControllerInput } from '../host/MissionSessionController'
import {
  GeneratedMissionCatalogRepository,
  type MissionCatalogRepository,
} from '../missions/catalog'
import { IndexedDbProgressRepository } from '../progress/indexedDbProgressRepository'
import type { OsProgressRepository } from '../progress/domain'

export type Clock = () => Date

export interface HostTransport {
  createSession(input: MissionSessionControllerInput): MissionSessionController
}

export interface VerificationPort {
  accept(record: Readonly<Record<string, unknown>>): Promise<{ readonly kind: 'pending' }>
}

export interface AnalyticsPort {
  emit(name: string, dimensions?: Readonly<Record<string, string>>): void
}

export type AppServices = {
  readonly progress: OsProgressRepository
  readonly navigation: NavigationPort
  readonly missions: MissionCatalogRepository
  readonly host: HostTransport
  readonly verification: VerificationPort
  readonly analytics: AnalyticsPort
  readonly clock: Clock
}

const browserHostTransport: HostTransport = {
  createSession(input) {
    return new MissionSessionController(input)
  },
}

const pendingVerification: VerificationPort = {
  async accept() {
    return { kind: 'pending' }
  },
}

const noOpAnalytics: AnalyticsPort = { emit() {} }

export function createServices(overrides: Partial<AppServices> = {}): AppServices {
  return {
    progress: overrides.progress ?? new IndexedDbProgressRepository(),
    navigation: overrides.navigation ?? new BrowserNavigation(),
    missions: overrides.missions ?? new GeneratedMissionCatalogRepository(),
    host: overrides.host ?? browserHostTransport,
    verification: overrides.verification ?? pendingVerification,
    analytics: overrides.analytics ?? noOpAnalytics,
    clock: overrides.clock ?? (() => new Date()),
  }
}
