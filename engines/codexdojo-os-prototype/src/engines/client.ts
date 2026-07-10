import type { EngineActionResult, EngineId } from './protocol'

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>
export type BridgeTokenReader = () => string | null

export class InvalidEngineBridgeResponseError extends Error {
  constructor() {
    super('Engine bridge returned an invalid response')
    this.name = 'InvalidEngineBridgeResponseError'
  }
}

export class MissingEngineBridgeTokenError extends Error {
  constructor() {
    super('Engine bridge session token is unavailable')
    this.name = 'MissingEngineBridgeTokenError'
  }
}

function readDocumentBridgeToken(): string | null {
  return document.querySelector<HTMLMetaElement>('meta[name="codexdojo-bridge-token"]')?.content ?? null
}

export function createEngineActionClient(
  fetcher: Fetcher = fetch,
  readToken: BridgeTokenReader = readDocumentBridgeToken,
) {
  return async (engineId: EngineId, action: string): Promise<EngineActionResult> => {
    const token = readToken()
    if (token === null || token === '') throw new MissingEngineBridgeTokenError()
    const response = await fetcher(
      `/__dojo/bridge/v1/engines/${encodeURIComponent(engineId)}/actions/${encodeURIComponent(action)}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-codexdojo-bridge-token': token,
        },
        body: '{}',
      },
    )
    const body: unknown = await response.json()
    if (!isEngineActionResult(body)) throw new InvalidEngineBridgeResponseError()
    return body
  }
}

function isEngineActionResult(value: unknown): value is EngineActionResult {
  if (typeof value !== 'object' || value === null) return false
  return (
    'ok' in value
    && typeof value.ok === 'boolean'
    && 'summary' in value
    && typeof value.summary === 'string'
    && 'output' in value
    && typeof value.output === 'string'
  )
}
