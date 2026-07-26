import type { ActionExecutor } from './actions'
import { executeAllowedAction } from './actions'
import {
  acceptAnalyticsBatch,
  type AnalyticsBatchSink,
  decodeAnalyticsBatch,
} from './analytics'
import { executeFixedVerification } from './verification'

const MAX_ACTION_BODY_BYTES = 4_096

/** Route identity lives here so the plugin middleware and the router cannot disagree. */
export const BRIDGE_ROOT = '/__dojo/bridge/v1'
export const BRIDGE_ANALYTICS_PATH = `${BRIDGE_ROOT}/analytics`
export const BRIDGE_VERIFICATION_PATH = `${BRIDGE_ROOT}/verification`
export const MAX_ANALYTICS_BODY_BYTES = 65_536

export type BridgeRequest = {
  readonly method: string
  readonly pathname: string
  readonly body: string
}

export type BridgeResponse = {
  readonly status: number
  readonly body: Readonly<Record<string, unknown>>
}

export async function routeBridgeRequest(
  request: BridgeRequest,
  executor: ActionExecutor,
  analyticsSink: AnalyticsBatchSink = acceptAnalyticsBatch,
): Promise<BridgeResponse> {
  const bodyLimit = request.pathname === BRIDGE_ANALYTICS_PATH
    ? MAX_ANALYTICS_BODY_BYTES
    : MAX_ACTION_BODY_BYTES
  if (Buffer.byteLength(request.body, 'utf8') > bodyLimit) {
    return { status: 413, body: { error: 'body-too-large' } }
  }
  if (request.pathname === BRIDGE_ANALYTICS_PATH) {
    return routeAnalytics(request, analyticsSink)
  }
  if (request.pathname === BRIDGE_VERIFICATION_PATH) {
    return routeVerification(request, executor)
  }
  const match = request.pathname.match(
    /^\/__dojo\/bridge\/v1\/engines\/([^/]+)\/actions\/([^/]+)$/,
  )
  if (match === null) return { status: 404, body: { error: 'not-found' } }
  if (request.method !== 'POST') {
    return { status: 405, body: { error: 'method-not-allowed' } }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(request.body)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return { status: 400, body: { error: 'malformed-json' } }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 400, body: { error: 'invalid-body' } }
  }

  const engineId = match[1]
  const action = match[2]
  if (engineId === undefined || action === undefined) {
    return { status: 404, body: { error: 'not-found' } }
  }
  const receipt = await executeAllowedAction(engineId, action, executor)
  if (receipt === undefined) return { status: 404, body: { error: 'action-not-found' } }

  const output = [receipt.stdout, receipt.stderr].filter((line) => line !== '').join('\n')
  return {
    status: 200,
    body: {
      ok: receipt.exitCode === 0,
      summary: receipt.exitCode === 0 ? 'Ação concluída' : 'Ação terminou com falha',
      output,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => key in value)
}

function parseJsonObject(request: BridgeRequest): BridgeResponse | Record<string, unknown> {
  if (request.method !== 'POST') return { status: 405, body: { error: 'method-not-allowed' } }
  try {
    const parsed: unknown = JSON.parse(request.body)
    return isRecord(parsed) ? parsed : { status: 400, body: { error: 'invalid-body' } }
  } catch {
    return { status: 400, body: { error: 'malformed-json' } }
  }
}

function isBridgeResponse(value: BridgeResponse | Record<string, unknown>): value is BridgeResponse {
  return 'status' in value && typeof value.status === 'number' && 'body' in value
}

async function routeVerification(request: BridgeRequest, executor: ActionExecutor): Promise<BridgeResponse> {
  const parsed = parseJsonObject(request)
  if (isBridgeResponse(parsed)) return parsed
  if (
    !hasExactKeys(parsed, ['schemaId', 'schemaVersion', 'record'])
    || typeof parsed.schemaId !== 'string'
    || !Number.isInteger(parsed.schemaVersion)
    || !isRecord(parsed.record)
  ) {
    return { status: 400, body: { error: 'invalid-body' } }
  }
  const result = await executeFixedVerification({
    schemaId: parsed.schemaId,
    schemaVersion: Number(parsed.schemaVersion),
    record: parsed.record,
  }, executor)
  if (!result.ok) {
    return { status: result.code === 'unsupported-schema' ? 404 : 422, body: { error: result.code } }
  }
  return { status: 200, body: { receipt: result.receipt } }
}

async function routeAnalytics(
  request: BridgeRequest,
  analyticsSink: AnalyticsBatchSink,
): Promise<BridgeResponse> {
  const parsed = parseJsonObject(request)
  if (isBridgeResponse(parsed)) return parsed
  const batch = decodeAnalyticsBatch(parsed)
  if (batch === null) return { status: 400, body: { error: 'invalid-analytics-batch' } }
  const result = await analyticsSink(batch)
  const submitted = new Set(batch.events.map((event) => event.eventId))
  if (
    !Array.isArray(result.acceptedEventIds) ||
    result.acceptedEventIds.some((eventId) => typeof eventId !== 'string' || !submitted.has(eventId))
  ) {
    return { status: 502, body: { error: 'invalid-analytics-response' } }
  }
  return { status: 202, body: { acceptedEventIds: [...new Set(result.acceptedEventIds)] } }
}
