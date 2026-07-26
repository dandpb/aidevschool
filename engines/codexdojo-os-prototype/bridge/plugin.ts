import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'
import type { BridgeResponse } from './router'
import {
  BRIDGE_ANALYTICS_PATH,
  BRIDGE_ROOT,
  MAX_ANALYTICS_BODY_BYTES,
  routeBridgeRequest,
} from './router'
import { EngineProcessTimeoutError, runProcess } from './processRunner'

const BRIDGE_PREFIX = `${BRIDGE_ROOT}/`
const BRIDGE_SESSION_PATH = `${BRIDGE_ROOT}/session`
const MAX_BODY_BYTES = 4_096
const BRIDGE_TOKEN_HEADER = 'x-codexdojo-bridge-token'

type BridgeServer = Pick<ViteDevServer | PreviewServer, 'middlewares' | 'config'>

export type BridgeAuthorizationInput = {
  readonly remoteAddress: string | undefined
  readonly origin: string | undefined
  readonly host: string | undefined
  readonly contentType: string | undefined
  readonly token: string | undefined
}


class BridgeBodyTooLargeError extends Error {
  constructor() {
    super(`Engine bridge request exceeds ${MAX_BODY_BYTES} bytes`)
    this.name = 'BridgeBodyTooLargeError'
  }
}

export function isLoopbackAddress(address: string | undefined): boolean {
  return address === '::1' || address?.startsWith('127.') === true || address?.startsWith('::ffff:127.') === true
}

export function getBridgeAuthorizationError(
  request: BridgeAuthorizationInput,
  expectedToken: string,
): string | null {
  if (!isLoopbackAddress(request.remoteAddress)) return 'loopback-only'
  if (request.host === undefined || request.origin === undefined) return 'origin-forbidden'
  if (request.origin !== `http://${request.host}` && request.origin !== `https://${request.host}`) {
    return 'origin-forbidden'
  }
  if (request.contentType?.toLowerCase().startsWith('application/json') !== true) {
    return 'json-required'
  }
  if (request.token === undefined || !tokensEqual(request.token, expectedToken)) {
    return 'invalid-token'
  }
  return null
}

export function getAnalyticsAuthorizationError(
  request: Omit<BridgeAuthorizationInput, 'token'>,
): string | null {
  return getBridgeAuthorizationError({ ...request, token: 'same-origin-analytics' }, 'same-origin-analytics')
}

export function getSessionAuthorizationError(request: {
  readonly remoteAddress: string | undefined
  readonly method: string | undefined
  readonly fetchSite: string | undefined
}): string | null {
  if (!isLoopbackAddress(request.remoteAddress)) return 'loopback-only'
  if (request.method !== 'GET') return 'method-not-allowed'
  if (request.fetchSite !== 'same-origin') return 'origin-forbidden'
  return null
}

export function isVerificationRouteEnabled(pathname: string, enabled: boolean): boolean {
  return enabled || pathname !== `${BRIDGE_ROOT}/verification`
}

export function isAnalyticsRouteEnabled(pathname: string, enabled: boolean): boolean {
  return enabled || pathname !== BRIDGE_ANALYTICS_PATH
}

export function bridgeRequestNeedsExclusiveExecution(pathname: string): boolean {
  return pathname !== `${BRIDGE_ROOT}/verification` && pathname !== BRIDGE_ANALYTICS_PATH
}

function tokensEqual(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received)
  const expectedBytes = Buffer.from(expected)
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes)
}

export function engineBridgePlugin(
  sessionToken = randomBytes(32).toString('base64url'),
  verificationEnabled = process.env.VITE_LOCAL_ENGINE_BRIDGE === 'true',
  analyticsEnabled = process.env.VITE_ANALYTICS_BRIDGE === 'true',
): Plugin {
  let bridgeBusy = false
  const configureBridge = (server: BridgeServer): void => {
    server.middlewares.use((request, response, next) => {
      const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
      if (pathname === BRIDGE_SESSION_PATH) {
        const authorizationError = getSessionAuthorizationError({
          remoteAddress: request.socket.remoteAddress,
          method: request.method,
          fetchSite: firstHeader(request.headers['sec-fetch-site']),
        })
        if (authorizationError !== null) {
          sendJson(response, {
            status: authorizationError === 'method-not-allowed' ? 405 : 403,
            body: { error: authorizationError },
          })
          return
        }
        response.setHeader('cross-origin-resource-policy', 'same-origin')
        sendJson(response, { status: 200, body: { token: sessionToken } })
        return
      }
      if (!pathname.startsWith(BRIDGE_PREFIX)) {
        next()
        return
      }
      if (!isVerificationRouteEnabled(pathname, verificationEnabled)) {
        sendJson(response, { status: 404, body: { error: 'not-found' } })
        return
      }
      if (!isAnalyticsRouteEnabled(pathname, analyticsEnabled)) {
        sendJson(response, { status: 404, body: { error: 'not-found' } })
        return
      }

      const authorizationInput = {
        remoteAddress: request.socket.remoteAddress,
        origin: firstHeader(request.headers.origin),
        host: firstHeader(request.headers.host),
        contentType: firstHeader(request.headers['content-type']),
        token: firstHeader(request.headers[BRIDGE_TOKEN_HEADER]),
      }
      const authorizationError = pathname === BRIDGE_ANALYTICS_PATH
        ? getAnalyticsAuthorizationError(authorizationInput)
        : getBridgeAuthorizationError(authorizationInput, sessionToken)
      if (authorizationError !== null) {
        sendJson(response, {
          status: authorizationError === 'json-required' ? 415 : 403,
          body: { error: authorizationError },
        })
        return
      }
      const needsExclusiveExecution = bridgeRequestNeedsExclusiveExecution(pathname)
      if (needsExclusiveExecution && bridgeBusy) {
        sendJson(response, { status: 429, body: { error: 'bridge-busy' } })
        return
      }
      if (needsExclusiveExecution) bridgeBusy = true

      void handleBridgeRequest(request, response, pathname).catch((error: unknown) => {
        if (error instanceof BridgeBodyTooLargeError) {
          sendJson(response, { status: 413, body: { error: 'body-too-large' } })
          return
        }
        if (error instanceof EngineProcessTimeoutError) {
          sendJson(response, {
            status: 504,
            body: { ok: false, summary: 'A ação excedeu o tempo limite', output: error.message },
          })
          return
        }
        server.config.logger.error('Engine bridge request failed')
        sendJson(response, { status: 500, body: { error: 'bridge-failure' } })
      }).finally(() => {
        if (needsExclusiveExecution) bridgeBusy = false
      })
    })
  }

  return {
    name: 'codexdojo-engine-bridge',
    configureServer: configureBridge,
    configurePreviewServer: configureBridge,
  }
}

function firstHeader(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.[0]
}

async function handleBridgeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<void> {
  const body = await readBody(
    request,
    pathname === BRIDGE_ANALYTICS_PATH ? MAX_ANALYTICS_BODY_BYTES : MAX_BODY_BYTES,
  )
  const bridgeResponse = await routeBridgeRequest(
    { method: request.method ?? 'GET', pathname, body },
    runProcess,
  )
  sendJson(response, bridgeResponse)
}

function readBody(request: IncomingMessage, maxBodyBytes: number): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    let body = ''
    let oversized = false
    request.setEncoding('utf8')
    request.on('data', (chunk: string) => {
      if (oversized) return
      body += chunk
      oversized = Buffer.byteLength(body, 'utf8') > maxBodyBytes
    })
    request.on('end', () => {
      if (oversized) {
        rejectBody(new BridgeBodyTooLargeError())
        return
      }
      resolveBody(body)
    })
    request.on('error', rejectBody)
  })
}

function sendJson(response: ServerResponse, bridgeResponse: BridgeResponse): void {
  if (response.headersSent) return
  response.statusCode = bridgeResponse.status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.end(JSON.stringify(bridgeResponse.body))
}
