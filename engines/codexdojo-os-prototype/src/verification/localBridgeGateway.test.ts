import { describe, expect, it, vi } from 'vitest'
import { LocalBridgeGateway } from './localBridgeGateway'
import type { EvidenceSubmission } from './ports'

const evidence: EvidenceSubmission = {
  schemaId: 'literacy-evidence',
  schemaVersion: 1,
  engineId: 'literacyDojo',
  missionRunId: 'run-1',
  subject: { missionId: 'l02', unitId: 'ai-literacy:l02' },
  record: { lessonId: 'l02', deterministicChecks: { confidence: 1e-7 } },
}

const receipt = {
  verdict: 'PASS',
  context_isolated: true,
  source: 'independent-literacy-verifier',
  evidence_digest: 'a'.repeat(64),
  lesson_id: 'l02',
  activity_id: 'l02-a1',
  attempt_id: 'attempt-1',
  activity_type: 'output_comparison',
  score: 1,
  producer_pass_claim: true,
  independent_pass: true,
  mastery_eligible: true,
  errors: [],
  producer_writes_mastered: false,
  max_producer_claim: 'completed',
}

describe('LocalBridgeGateway', () => {
  it('reuses the shared token provider and never sends a browser digest', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ receipt }), { status: 200 }),
    )
    const getToken = vi.fn().mockResolvedValue('token')
    const gateway = new LocalBridgeGateway(fetcher, getToken)

    await expect(gateway.verify(evidence)).resolves.toEqual(receipt)

    expect(getToken).toHaveBeenCalledOnce()
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      schemaId: 'literacy-evidence',
      schemaVersion: 1,
      record: evidence.record,
    })
  })

  it('retries bounded bridge-busy responses before reporting unavailability', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'bridge-busy' }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ receipt }), { status: 200 }))
    const gateway = new LocalBridgeGateway(fetcher, async () => 'token')

    await expect(gateway.verify(evidence)).resolves.toEqual(receipt)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects a non-lowercase SHA-256 receipt at the browser trust boundary', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        receipt: { ...receipt, evidence_digest: 'A'.repeat(64) },
      }), { status: 200 }),
    )
    const gateway = new LocalBridgeGateway(fetcher, async () => 'token')

    await expect(gateway.verify(evidence)).rejects.toThrow('invalid-verification-receipt')
  })

  it('surfaces bridge 4xx validation rejection separately from unavailability', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid-verifier-response' }), { status: 422 }),
    )
    const gateway = new LocalBridgeGateway(fetcher, async () => 'token')

    await expect(gateway.verify(evidence)).rejects.toMatchObject({
      name: 'EvidenceGatewayRejection',
      code: 'invalid-verifier-response',
    })
  })
})
