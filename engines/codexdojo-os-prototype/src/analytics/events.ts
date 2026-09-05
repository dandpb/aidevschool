export const ANALYTICS_EVENT_NAMES = [
  'onboarding.started', 'onboarding.completed', 'journey.returned',
  'mission.started', 'mission.completed', 'structured_attempt.submitted',
  'structured_attempt.passed', 'hint.requested', 'retry.requested',
  'review.started', 'verification.state_changed', 'renderer.degraded',
] as const
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]
export type AnalyticsScalar = string | number | boolean
export type AnalyticsDimensions = Readonly<Record<string, AnalyticsScalar>>
export type AnalyticsContext = {
  readonly trackId?: 'ai-pratica' | 'dev'
  readonly missionId?: string
  readonly missionRunId?: string
  readonly engineId?: 'literacyDojo' | 'voxelDojo'
  readonly engineVersion?: string
  readonly contentVersion?: string
  readonly rendererMode?: 'webgl' | 'canvas2d' | 'dom' | 'none'
}

export type AnalyticsEventInput = {
  readonly name: AnalyticsEventName
  readonly dimensions?: AnalyticsDimensions
  readonly context?: AnalyticsContext
}

export type AnalyticsEvent = {
  readonly schemaVersion: 1
  readonly eventId: string
  readonly name: AnalyticsEventName
  readonly occurredAt: string
  readonly sequence: number
  readonly dimensions: AnalyticsDimensions & {
    readonly installationId: string
    readonly sessionId: string
  }
}

type EventVocabularies = Readonly<Record<string, readonly AnalyticsScalar[] | undefined>>

type EventPolicy = {
  readonly dimensions: readonly string[]
  readonly vocabularies: EventVocabularies
}

type NamedEventRecord = Record<string, unknown> & { readonly name: AnalyticsEventName }

const ACTIVITY_TYPES: readonly AnalyticsScalar[] = [
  'choice', 'sort', 'missing_context', 'safety_classification', 'prompt_builder',
  'output_comparison', 'rubric_review',
]

// As dimensões permitidas de cada evento são exatamente as chaves do seu vocabulário.
// Exported for the collector parity test: the staged same-origin collector
// (learner/gate/netlify-functions/dojo-analytics-collector.mjs) must keep an
// identical closed vocabulary on the receiving side (AID-470 F1).
export const EVENT_VOCABULARIES: Readonly<Record<AnalyticsEventName, EventVocabularies>> = {
  'onboarding.started': {},
  'onboarding.completed': { recommendationChanged: [true, false] },
  'journey.returned': {},
  'mission.started': { mode: ['initial', 'review', 'retry', 'targeted-practice'] },
  'mission.completed': { result: ['completed', 'failed'] },
  'structured_attempt.submitted': { activityType: ACTIVITY_TYPES },
  'structured_attempt.passed': { activityType: ACTIVITY_TYPES },
  'hint.requested': {
    mode: ['question', 'explain', 'hint'],
    source: ['provider', 'fallback', 'policy'],
    outcome: ['answered', 'attempt-required', 'quota-exhausted', 'unavailable'],
  },
  'retry.requested': {
    reason: ['retry', 'targeted-practice', 'verification-unavailable', 'engine-retry'],
  },
  'review.started': { reason: ['canonical-review', 'due', 'overdue'] },
  'verification.state_changed': {
    state: ['validating', 'pending', 'verified', 'rejected', 'gateway-unavailable'],
    verdict: ['PASS', 'FAIL', 'INVALID'],
  },
  'renderer.degraded': {
    reason: [
      'unsupported', 'creation-failed', 'context-lost', 'restore-failed', 'load-timeout',
      'reduced-motion',
    ],
    fallback: ['canvas2d', 'dom', 'none'],
  },
}

const EVENT_POLICIES: Readonly<Record<AnalyticsEventName, EventPolicy>> = (() => {
  const policies = {} as Record<AnalyticsEventName, EventPolicy>
  for (const name of ANALYTICS_EVENT_NAMES) {
    const vocabularies = EVENT_VOCABULARIES[name]
    policies[name] = { dimensions: Object.keys(vocabularies), vocabularies }
  }
  return policies
})()

export const CONTEXT_KEYS: readonly string[] = [
  'trackId',
  'missionId',
  'missionRunId',
  'engineId',
  'engineVersion',
  'contentVersion',
  'rendererMode',
]
export const CONTEXT_VOCABULARIES: Readonly<Record<string, readonly string[] | undefined>> = {
  trackId: ['ai-pratica', 'dev'],
  engineId: ['literacyDojo', 'voxelDojo'],
  rendererMode: ['webgl', 'canvas2d', 'dom', 'none'],
}
const ENRICHED_KEYS: readonly string[] = ['installationId', 'sessionId', ...CONTEXT_KEYS]
const EVENT_NAMES = new Set<string>(ANALYTICS_EVENT_NAMES)
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

function isBoundedScalar(value: unknown): value is AnalyticsScalar {
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && value.length > 0 && value.length <= 128
}

function dimensionsAreValid(
  value: unknown,
  allowed: readonly string[],
  required: readonly string[] = [],
): value is Record<string, AnalyticsScalar> {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, allowed)) return false
  if (!required.every((key) => key in value)) return false
  return Object.values(value).every(isBoundedScalar)
}

function contextValueIsValid(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false
  if (!SAFE_IDENTIFIER.test(value)) return false
  const vocabulary = CONTEXT_VOCABULARIES[key]
  return vocabulary === undefined || vocabulary.includes(value)
}

function contextIsValid(value: unknown): value is AnalyticsContext {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, CONTEXT_KEYS)) return false
  return Object.entries(value).every(([key, item]) => contextValueIsValid(key, item))
}

function contextDimensionsAreValid(dimensions: AnalyticsDimensions): boolean {
  return CONTEXT_KEYS.every(
    (key) => !(key in dimensions) || contextValueIsValid(key, dimensions[key]),
  )
}

function enrichedIdentityIsValid(dimensions: AnalyticsDimensions): boolean {
  if (!contextValueIsValid('installationId', dimensions.installationId)) return false
  return contextValueIsValid('sessionId', dimensions.sessionId)
}

function valuesMatchPolicy(policy: EventPolicy, dimensions: AnalyticsDimensions): boolean {
  return Object.entries(dimensions).every(([key, value]) => {
    const vocabulary = policy.vocabularies[key]
    return vocabulary === undefined || vocabulary.includes(value)
  })
}

function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === 'string' && EVENT_NAMES.has(value)
}

function eventEnvelopeFieldsAreValid(value: Record<string, unknown>): value is NamedEventRecord {
  if (value.schemaVersion !== 1) return false
  if (typeof value.eventId !== 'string') return false
  if (value.eventId.length === 0 || value.eventId.length > 128) return false
  if (!isAnalyticsEventName(value.name)) return false
  return true
}

function eventTimingIsValid(value: Record<string, unknown>): boolean {
  if (typeof value.occurredAt !== 'string') return false
  if (Number.isNaN(Date.parse(value.occurredAt))) return false
  if (!Number.isInteger(value.sequence)) return false
  return Number(value.sequence) >= 1
}

export function analyticsEventInputIsValid(value: unknown): value is AnalyticsEventInput {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ['name', 'dimensions', 'context'])) return false
  const name = value.name
  if (!isAnalyticsEventName(name)) return false
  const dimensions = value.dimensions ?? {}
  const policy = EVENT_POLICIES[name]
  if (!dimensionsAreValid(dimensions, policy.dimensions)) return false
  if (!valuesMatchPolicy(policy, dimensions)) return false
  return value.context === undefined || contextIsValid(value.context)
}

export function analyticsEventIsValid(value: unknown): value is AnalyticsEvent {
  if (!isRecord(value)) return false
  if (!hasOnlyKeys(value, ['schemaVersion', 'eventId', 'name', 'occurredAt', 'sequence', 'dimensions'])) return false
  if (!eventEnvelopeFieldsAreValid(value)) return false
  if (!eventTimingIsValid(value)) return false
  const policy = EVENT_POLICIES[value.name]
  const allowed = [...ENRICHED_KEYS, ...policy.dimensions]
  if (!dimensionsAreValid(value.dimensions, allowed, ['installationId', 'sessionId'])) return false
  const dimensions = value.dimensions
  if (!enrichedIdentityIsValid(dimensions)) return false
  if (!contextDimensionsAreValid(dimensions)) return false
  return valuesMatchPolicy(policy, dimensions)
}

export type AnalyticsPort = {
  emit(input: AnalyticsEventInput): boolean
}

export function emitAnalyticsSafely(port: AnalyticsPort, input: AnalyticsEventInput): boolean {
  try {
    return port.emit(input)
  } catch {
    return false
  }
}
