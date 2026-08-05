import {
  createBridgeTokenProvider,
  type BridgeTokenProvider,
  type Fetcher,
} from '../engines/client'
import type { EvidenceSubmission, VerificationGateway, VerificationReceipt } from './ports'
import { EvidenceGatewayRejection } from './ports'
import { receiptShapeIsValid } from './receiptContract'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeReceipt(value: unknown): VerificationReceipt {
  if (!receiptShapeIsValid(value))
    throw new EvidenceGatewayRejection('invalid-verification-receipt')
  return value
}

export class LocalBridgeGateway implements VerificationGateway {
  private readonly getToken: BridgeTokenProvider

  constructor(
    private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
    getToken?: BridgeTokenProvider,
  ) {
    this.getToken = getToken ?? createBridgeTokenProvider(this.fetcher)
  }

  async verify(request: EvidenceSubmission): Promise<VerificationReceipt> {
    const body = await this.post('/__dojo/bridge/v1/verification', {
      schemaId: request.schemaId,
      schemaVersion: request.schemaVersion,
      record: request.record,
    })
    if (!('receipt' in body)) throw new EvidenceGatewayRejection('missing-verification-receipt')
    return decodeReceipt(body.receipt)
  }

  private async post(
    pathname: string,
    requestBody: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const token = await this.getToken()
    if (token === null || token === '') throw new Error('bridge-session-unavailable')
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(pathname, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-codexdojo-bridge-token': token,
        },
        body: JSON.stringify(requestBody),
      })
      if (response.status === 429 && attempt < 3) {
        await new Promise((resolve) => window.setTimeout(resolve, 75 * (attempt + 1)))
        continue
      }
      const body: unknown = await response.json()
      if (!isRecord(body)) throw new Error('bridge-request-failed')
      if (!response.ok) {
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429 &&
          typeof body.error === 'string'
        ) {
          throw new EvidenceGatewayRejection(body.error)
        }
        throw new Error('bridge-request-failed')
      }
      return body
    }
    throw new Error('bridge-request-failed')
  }
}
