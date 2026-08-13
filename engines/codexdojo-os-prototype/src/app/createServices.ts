import { AnalyticsBatcher, LocalStorageAnalyticsQueueStore } from '../analytics/batcher'
import { AnalyticsCollector } from '../analytics/collector'
import type { AnalyticsPort } from '../analytics/events'
import { InMemoryAnalyticsTransport, SameOriginAnalyticsTransport } from '../analytics/transports'
import {
  MissionSessionController,
  type MissionSessionControllerInput,
} from '../host/MissionSessionController'
import { createMentorProvider, type MentorProvider } from '../mentor/provider'
import {
  GeneratedMissionCatalogRepository,
  type MissionCatalogRepository,
} from '../missions/catalog'
import type { OsProgressRepository } from '../progress/domain'
import { IndexedDbProgressRepository } from '../progress/indexedDbProgressRepository'
import { EvidenceIntake } from '../verification/evidenceIntake'
import { IndexedDbVerificationStore } from '../verification/indexedDbEvidenceRepositories'
import { LocalBridgeGateway } from '../verification/localBridgeGateway'
import type { VerificationService } from '../verification/ports'
import { BrowserNavigation, type NavigationPort } from './routes'

export type Clock = () => Date

export interface HostTransport {
  createSession(input: MissionSessionControllerInput): MissionSessionController
}

export type AppServices = {
  readonly progress: OsProgressRepository
  readonly navigation: NavigationPort
  readonly missions: MissionCatalogRepository
  readonly host: HostTransport
  readonly verification: VerificationService
  readonly mentor: MentorProvider
  readonly analytics: AnalyticsPort
  readonly clock: Clock
}

const browserHostTransport: HostTransport = {
  createSession(input) {
    return new MissionSessionController(input)
  },
}

function createVerification(clock: Clock): VerificationService {
  return new EvidenceIntake({
    store: new IndexedDbVerificationStore(),
    gateway: new LocalBridgeGateway(),
    clock,
  })
}

function createAnalytics(clock: Clock): AnalyticsPort {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT
  const transport =
    endpoint === undefined || endpoint === ''
      ? new InMemoryAnalyticsTransport()
      : new SameOriginAnalyticsTransport(endpoint)
  const batcher = new AnalyticsBatcher(transport, {
    store: new LocalStorageAnalyticsQueueStore(),
  })
  return new AnalyticsCollector(batcher, { clock })
}

export function createServices(overrides: Partial<AppServices> = {}): AppServices {
  const clock = overrides.clock ?? (() => new Date())
  return {
    progress: overrides.progress ?? new IndexedDbProgressRepository(),
    navigation: overrides.navigation ?? new BrowserNavigation(),
    missions: overrides.missions ?? new GeneratedMissionCatalogRepository(),
    host: overrides.host ?? browserHostTransport,
    verification: overrides.verification ?? createVerification(clock),
    mentor: overrides.mentor ?? createMentorProvider(import.meta.env.VITE_MENTOR_ENDPOINT),
    analytics: overrides.analytics ?? createAnalytics(clock),
    clock,
  }
}
