import type { EngineActionResult, EngineId } from './protocol'

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>
export type BridgeTokenProvider = () => Promise<string | null>

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

function createBridgeTokenProvider(fetcher: Fetcher): BridgeTokenProvider {
  let request: Promise<string | null> | undefined
  return () => {
    if (request === undefined) {
      const attempt = fetcher('/__dojo/bridge/v1/session', {
        method: 'GET',
        headers: { accept: 'application/json' },
      }).then(async (response) => {
        if (!response.ok) return null
        const body: unknown = await response.json()
        if (typeof body !== 'object' || body === null || !('token' in body)) return null
        return typeof body.token === 'string' && body.token !== '' ? body.token : null
      })
      // A token stays cached for the session, but a failed bootstrap must not
      // disable the bridge forever: the next action retries the handshake.
      request = attempt.then(
        (token) => {
          if (token === null) request = undefined
          return token
        },
        (error: unknown) => {
          request = undefined
          throw error
        },
      )
    }
    return request
  }
}

export function createEngineActionClient(
  fetcher: Fetcher = fetch,
  getToken: BridgeTokenProvider = createBridgeTokenProvider(fetcher),
) {
  return async (engineId: EngineId, action: string): Promise<EngineActionResult> => {
    const token = await getToken()
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
