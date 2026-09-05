import { describe, expect, it, vi } from 'vitest'
import { EvidenceGatewayRejection } from './ports'
import { digest, mission, receipt, setup, submission } from './evidenceIntakeTestFixtures'

describe('EvidenceIntake literacy verification', () => {
  it('accepts exponent-valued evidence without computing or sending a browser digest', async () => {
    const verify = vi.fn(async (request) => {
      expect(request).not.toHaveProperty('evidenceDigest')
      expect(request.record.deterministicChecks).toEqual({ confidence: 1e-7, sources: true })
      return receipt()
    })
    const { intake } = setup({ verify })

    const state = await intake.accept(mission, submission())

    expect(state).toMatchObject({ kind: 'verified', evidenceDigest: digest })
    expect(verify).toHaveBeenCalledOnce()
  })

  it('uses an independent FAIL instead of trusting a producer pass', async () => {
    const { intake } = setup({
      async verify() {
        return receipt({
          verdict: 'FAIL',
          independent_pass: false,
          mastery_eligible: false,
          errors: ['independent check failed'],
        })
      },
    })

    const state = await intake.accept(mission, submission())

    expect(state.kind).toBe('verified')
    if (state.kind === 'verified') expect(state.receipt.verdict).toBe('FAIL')
  })

  it.each([
    ['digest', { evidence_digest: 'A'.repeat(64) }],
    ['lesson', { lesson_id: 'l03' }],
    ['activity', { activity_id: 'other' }],
    ['attempt', { attempt_id: 'other' }],
    ['type', { activity_type: 'choice' }],
    ['score', { score: 0 }],
    ['pass', { producer_pass_claim: false }],
  ] as const)('rejects a receipt with mismatched %s identity', async (_field, override) => {
    const { intake, store } = setup({ async verify() { return receipt(override) } })

    const state = await intake.accept(mission, submission())

    expect(state).toEqual({ kind: 'rejected', code: 'receipt-mismatch' })
    expect(store.receipts.size).toBe(0)
  })

  it('restores a receipt rejection after reload and does not retry it', async () => {
    const verify = vi.fn(async () => receipt({ activity_id: 'other' }))
    const { intake, store } = setup({ verify })

    await intake.accept(mission, submission())
    const restored = await intake.latest(mission)
    const retried = await intake.retry(mission)

    expect(store.raw.get('evidence-1')).toMatchObject({
      status: 'rejected',
      rejectionCode: 'receipt-mismatch',
    })
    expect(restored).toEqual({ kind: 'rejected', code: 'receipt-mismatch' })
    expect(retried).toEqual({ kind: 'rejected', code: 'receipt-mismatch' })
    expect(verify).toHaveBeenCalledOnce()
  })

  it('persists bridge validation rejection without presenting it as retryable downtime', async () => {
    const verify = vi.fn(async () => {
      throw new EvidenceGatewayRejection('invalid-verifier-response')
    })
    const { intake, store } = setup({ verify })

    const state = await intake.accept(mission, submission())

    expect(state).toEqual({ kind: 'rejected', code: 'invalid-verifier-response' })
    expect(store.raw.get('evidence-1')).toMatchObject({
      status: 'rejected',
      rejectionCode: 'invalid-verifier-response',
    })
    expect(await intake.latest(mission)).toEqual(state)
  })

  it('correlates the submitted lesson version to the launched mission', async () => {
    const verify = vi.fn(async () => receipt())
    const { intake } = setup({ verify })

    const state = await intake.accept(mission, submission({ lessonVersion: 2 }))

    expect(state).toEqual({ kind: 'rejected', code: 'subject-record-mismatch' })
    expect(verify).not.toHaveBeenCalled()
  })
})
