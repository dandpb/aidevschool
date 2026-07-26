import type { ActionExecutor } from './actions'
import { executeAllowedAction } from './actions'
import { executeFixedVerification } from './verification'

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
): Promise<BridgeResponse> {
  if (Buffer.byteLength(request.body, 'utf8') > 4_096) {
    return { status: 413, body: { error: 'body-too-large' } }
  }
  if (request.pathname === '/__dojo/bridge/v1/verification') {
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
