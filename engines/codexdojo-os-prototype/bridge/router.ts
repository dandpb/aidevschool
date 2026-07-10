import type { ActionExecutor } from './actions'
import { executeAllowedAction } from './actions'

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
