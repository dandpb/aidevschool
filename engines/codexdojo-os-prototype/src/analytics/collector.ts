import {
  type AnalyticsContext,
  type AnalyticsEvent,
  type AnalyticsEventInput,
  type AnalyticsPort,
  analyticsEventInputIsValid,
} from './events'

const INSTALLATION_ID_KEY = 'codexdojo-os.analytics.installation-id.v1'

export interface AnalyticsEventSink {
  enqueue(event: AnalyticsEvent): void
  nextSequence(): number
}

export interface InstallationIdentityStore {
  get(): string | null
  set(id: string): void
}

export class BrowserInstallationIdentityStore implements InstallationIdentityStore {
  get(): string | null {
    try {
      return window.localStorage.getItem(INSTALLATION_ID_KEY)
    } catch {
      return null
    }
  }

  set(id: string): void {
    try {
      window.localStorage.setItem(INSTALLATION_ID_KEY, id)
    } catch {
      return
    }
  }
}

export class InMemoryInstallationIdentityStore implements InstallationIdentityStore {
  private id: string | null = null

  get(): string | null {
    return this.id
  }

  set(id: string): void {
    this.id = id
  }
}

function randomId(prefix: string): string {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${id}`
}

function compactContext(context: AnalyticsContext | undefined): Record<string, string> {
  if (context === undefined) return {}
  return Object.fromEntries(
    Object.entries(context).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}

export class AnalyticsCollector implements AnalyticsPort {
  private readonly installationId: string
  private readonly sessionId: string

  constructor(
    private readonly sink: AnalyticsEventSink,
    private readonly options: {
      readonly clock?: () => Date
      readonly createId?: (prefix: string) => string
      readonly identityStore?: InstallationIdentityStore
    } = {},
  ) {
    const createId = options.createId ?? randomId
    const identityStore = options.identityStore ?? new BrowserInstallationIdentityStore()
    this.installationId = identityStore.get() ?? createId('installation')
    identityStore.set(this.installationId)
    this.sessionId = createId('session')
  }

  emit(input: AnalyticsEventInput): boolean {
    if (!analyticsEventInputIsValid(input)) return false
    const createId = this.options.createId ?? randomId
    const event: AnalyticsEvent = {
      schemaVersion: 1,
      eventId: createId('event'),
      name: input.name,
      occurredAt: (this.options.clock ?? (() => new Date()))().toISOString(),
      sequence: this.sink.nextSequence(),
      dimensions: {
        installationId: this.installationId,
        sessionId: this.sessionId,
        ...compactContext(input.context),
        ...(input.dimensions ?? {}),
      },
    }
    try {
      this.sink.enqueue(event)
      return true
    } catch {
      return false
    }
  }
}
