export const ANALYTICS_EVENT_NAMES = [
  'onboarding.started',
  'onboarding.completed',
  'journey.returned',
  'mission.started',
  'mission.completed',
  'structured_attempt.submitted',
  'structured_attempt.passed',
  'hint.requested',
  'retry.requested',
  'review.started',
  'verification.state_changed',
  'renderer.degraded',
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

const EVENT_DIMENSIONS: Readonly<Record<AnalyticsEventName, readonly string[]>> = {
  'onboarding.started': [],
  'onboarding.completed': ['recommendationChanged'],
  'journey.returned': [],
  'mission.started': ['mode'],
  'mission.completed': ['result'],
  'structured_attempt.submitted': ['activityType'],
  'structured_attempt.passed': ['activityType'],
  'hint.requested': ['mode', 'source', 'outcome'],
  'retry.requested': ['reason'],
  'review.started': ['reason'],
  'verification.state_changed': ['state', 'verdict'],
  'renderer.degraded': ['reason', 'fallback'],
}

const CONTEXT_KEYS = [
  'trackId',
  'missionId',
  'missionRunId',
  'engineId',
  'engineVersion',
  'contentVersion',
  'rendererMode',
] as const

const ENRICHED_KEYS = ['installationId', 'sessionId', ...CONTEXT_KEYS] as const
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
  if (!isRecord(value) || !hasOnlyKeys(value, allowed)) return false
  if (!required.every((key) => key in value)) return false
  return Object.values(value).every(isBoundedScalar)
}

function contextIsValid(value: unknown): value is AnalyticsContext {
  if (!isRecord(value) || !hasOnlyKeys(value, CONTEXT_KEYS)) return false
  if (
    !Object.values(value).every((item) => typeof item === 'string' && SAFE_IDENTIFIER.test(item))
  ) {
    return false
  }
  if (value.trackId !== undefined && value.trackId !== 'ai-pratica' && value.trackId !== 'dev') {
    return false
  }
  if (
    value.engineId !== undefined &&
    value.engineId !== 'literacyDojo' &&
    value.engineId !== 'voxelDojo'
  ) {
    return false
  }
  return (
    value.rendererMode === undefined ||
    value.rendererMode === 'webgl' ||
    value.rendererMode === 'canvas2d' ||
    value.rendererMode === 'dom' ||
    value.rendererMode === 'none'
  )
}

function valuesMatchClosedVocabulary(
  name: AnalyticsEventName,
  dimensions: AnalyticsDimensions,
): boolean {
  if (name === 'onboarding.completed') {
    return (
      dimensions.recommendationChanged === undefined ||
      typeof dimensions.recommendationChanged === 'boolean'
    )
  }
  if (name === 'mission.started') {
    return (
      dimensions.mode === undefined ||
      ['initial', 'review', 'retry', 'targeted-practice'].includes(String(dimensions.mode))
    )
  }
  if (name === 'mission.completed') {
    return (
      dimensions.result === undefined || ['completed', 'failed'].includes(String(dimensions.result))
    )
  }
  if (name === 'hint.requested') {
    return (
      (dimensions.mode === undefined ||
        ['question', 'explain', 'hint'].includes(String(dimensions.mode))) &&
      (dimensions.source === undefined ||
        ['provider', 'fallback', 'policy'].includes(String(dimensions.source))) &&
      (dimensions.outcome === undefined ||
        ['answered', 'attempt-required', 'quota-exhausted', 'unavailable'].includes(
          String(dimensions.outcome),
        ))
    )
  }
  if (name === 'structured_attempt.submitted' || name === 'structured_attempt.passed') {
    return (
      dimensions.activityType === undefined ||
      [
        'choice',
        'sort',
        'missing_context',
        'safety_classification',
        'prompt_builder',
        'output_comparison',
        'rubric_review',
      ].includes(String(dimensions.activityType))
    )
  }
  if (name === 'retry.requested') {
    return (
      dimensions.reason === undefined ||
      ['retry', 'targeted-practice', 'verification-unavailable', 'engine-retry'].includes(
        String(dimensions.reason),
      )
    )
  }
  if (name === 'review.started') {
    return (
      dimensions.reason === undefined ||
      ['canonical-review', 'due', 'overdue'].includes(String(dimensions.reason))
    )
  }
  if (name === 'verification.state_changed') {
    return (
      (dimensions.state === undefined ||
        ['validating', 'pending', 'verified', 'rejected', 'gateway-unavailable'].includes(
          String(dimensions.state),
        )) &&
      (dimensions.verdict === undefined ||
        ['PASS', 'FAIL', 'INVALID'].includes(String(dimensions.verdict)))
    )
  }
  if (name === 'renderer.degraded') {
    return (
      (dimensions.reason === undefined ||
        [
          'unsupported',
          'creation-failed',
          'context-lost',
          'restore-failed',
          'load-timeout',
          'reduced-motion',
        ].includes(String(dimensions.reason))) &&
      (dimensions.fallback === undefined ||
        ['canvas2d', 'dom', 'none'].includes(String(dimensions.fallback)))
    )
  }
  return true
}

export function analyticsEventInputIsValid(value: unknown): value is AnalyticsEventInput {
  if (!isRecord(value) || !hasOnlyKeys(value, ['name', 'dimensions', 'context'])) return false
  if (typeof value.name !== 'string' || !EVENT_NAMES.has(value.name)) return false
  const name = value.name as AnalyticsEventName
  const dimensions = value.dimensions ?? {}
  if (!dimensionsAreValid(dimensions, EVENT_DIMENSIONS[name])) return false
  if (!valuesMatchClosedVocabulary(name, dimensions)) return false
  return value.context === undefined || contextIsValid(value.context)
}

export function analyticsEventIsValid(value: unknown): value is AnalyticsEvent {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'schemaVersion',
      'eventId',
      'name',
      'occurredAt',
      'sequence',
      'dimensions',
    ]) ||
    value.schemaVersion !== 1 ||
    typeof value.eventId !== 'string' ||
    value.eventId.length === 0 ||
    value.eventId.length > 128 ||
    typeof value.name !== 'string' ||
    !EVENT_NAMES.has(value.name) ||
    typeof value.occurredAt !== 'string' ||
    Number.isNaN(Date.parse(value.occurredAt)) ||
    !Number.isInteger(value.sequence) ||
    Number(value.sequence) < 1
  ) {
    return false
  }
  const name = value.name as AnalyticsEventName
  const allowed = [...ENRICHED_KEYS, ...EVENT_DIMENSIONS[name]]
  if (!dimensionsAreValid(value.dimensions, allowed, ['installationId', 'sessionId'])) return false
  const dimensions = value.dimensions
  if (
    typeof dimensions.installationId !== 'string' ||
    !SAFE_IDENTIFIER.test(dimensions.installationId) ||
    typeof dimensions.sessionId !== 'string' ||
    !SAFE_IDENTIFIER.test(dimensions.sessionId)
  ) {
    return false
  }
  if (
    !contextIsValid(
      Object.fromEntries(
        CONTEXT_KEYS.filter((key) => key in dimensions).map((key) => [key, dimensions[key]]),
      ),
    )
  ) {
    return false
  }
  return valuesMatchClosedVocabulary(name, dimensions)
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
