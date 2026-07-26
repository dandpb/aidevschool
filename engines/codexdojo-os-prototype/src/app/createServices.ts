import { BrowserNavigation, type NavigationPort } from './routes'
import { MissionSessionController, type MissionSessionControllerInput } from '../host/MissionSessionController'
import {
  GeneratedMissionCatalogRepository,
  type MissionCatalogRepository,
} from '../missions/catalog'
import { IndexedDbProgressRepository } from '../progress/indexedDbProgressRepository'
import type { OsProgressRepository } from '../progress/domain'
import { EvidenceIntake } from '../verification/evidenceIntake'
import { IndexedDbVerificationStore } from '../verification/indexedDbEvidenceRepositories'
import { LocalBridgeGateway } from '../verification/localBridgeGateway'
import type { VerificationService } from '../verification/ports'

export type Clock = () => Date

export interface HostTransport {
  createSession(input: MissionSessionControllerInput): MissionSessionController
}

export interface AnalyticsPort {
  emit(name: string, dimensions?: Readonly<Record<string, string>>): void
}

export type AppServices = {
  readonly progress: OsProgressRepository
  readonly navigation: NavigationPort
  readonly missions: MissionCatalogRepository
  readonly host: HostTransport
  readonly verification: VerificationService
  readonly analytics: AnalyticsPort
  readonly clock: Clock
}

const browserHostTransport: HostTransport = {
  createSession(input) {
    return new MissionSessionController(input)
  },
}

const noOpAnalytics: AnalyticsPort = { emit() {} }

function createVerification(clock: Clock): VerificationService {
  return new EvidenceIntake({
    store: new IndexedDbVerificationStore(),
    gateway: new LocalBridgeGateway(),
    clock,
  })
}

export function createServices(overrides: Partial<AppServices> = {}): AppServices {
  const clock = overrides.clock ?? (() => new Date())
  return {
    progress: overrides.progress ?? new IndexedDbProgressRepository(),
    navigation: overrides.navigation ?? new BrowserNavigation(),
    missions: overrides.missions ?? new GeneratedMissionCatalogRepository(),
    host: overrides.host ?? browserHostTransport,
    verification: overrides.verification ?? createVerification(clock),
    analytics: overrides.analytics ?? noOpAnalytics,
    clock,
  }
}
