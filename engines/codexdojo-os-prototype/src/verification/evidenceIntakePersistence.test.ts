import { describe, expect, it, vi } from 'vitest'
import { digest, mission, receipt, setup, submission } from './evidenceIntakeTestFixtures'

describe('EvidenceIntake persistence and replay', () => {
  it('returns the stored receipt for a duplicate storage id without invoking the gateway twice', async () => {
    const verify = vi.fn(async () => receipt())
    const { intake } = setup({ verify })

    await intake.accept(mission, submission())
    const duplicate = await intake.accept(mission, submission())

    expect(duplicate.kind).toBe('verified')
    expect(verify).toHaveBeenCalledOnce()
  })

  it('rejects an altered replay without replacing or reverifying the first submission', async () => {
    const verify = vi.fn(async () => receipt())
    const { intake, store } = setup({ verify })
    const first = submission()

    const accepted = await intake.accept(mission, first)
    const alteredRecord = await intake.accept(mission, submission({ context: 'altered' }))
    const alteredVersion = await intake.accept(
      { ...mission, version: 4 },
      submission({ lessonVersion: 4 }),
    )

    expect(accepted.kind).toBe('verified')
    expect(alteredRecord).toEqual({ kind: 'rejected', code: 'storage-id-collision' })
    expect(alteredVersion).toEqual({ kind: 'rejected', code: 'storage-id-collision' })
    expect(store.raw.get('run-1')?.record).toEqual(first.record)
    expect(verify).toHaveBeenCalledOnce()
  })

  it.each([
    ['identical', 'initial', 'verified'],
    ['differing', 'altered', 'rejected'],
  ] as const)(
    'serializes %s simultaneous submissions with the same run id',
    async (_delivery, context, expected) => {
      let releaseGateway!: () => void
      const verify = vi.fn(async () => {
        await new Promise<void>((resolve) => {
          releaseGateway = resolve
        })
        return receipt()
      })
      const { intake, store } = setup({ verify })
      const firstSubmission = submission()

      const first = intake.accept(mission, firstSubmission)
      await vi.waitFor(() => expect(verify).toHaveBeenCalledOnce())
      const replay = intake.accept(mission, submission({ context }))
      await Promise.resolve()

      expect(verify).toHaveBeenCalledOnce()
      releaseGateway()
      const accepted = await first
      expect(accepted).toMatchObject({ kind: 'verified', evidenceDigest: digest })
      expect(await replay).toEqual(
        expected === 'verified' ? accepted : { kind: 'rejected', code: 'storage-id-collision' },
      )
      expect(store.raw.get('run-1')?.record).toEqual(firstSubmission.record)
      expect(verify).toHaveBeenCalledOnce()
    },
  )

  it('preserves raw evidence under a stable opaque id and retries after gateway failure', async () => {
    const verify = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(receipt())
    const { intake, store } = setup({ verify })

    const unavailable = await intake.accept(mission, submission())
    const retried = await intake.retry(mission)

    expect(unavailable).toEqual({
      kind: 'gateway-unavailable',
      storageId: 'run-1',
      retryable: true,
    })
    expect(store.raw.get('run-1')).toMatchObject({
      storageId: 'run-1',
      status: 'verified',
      evidenceDigest: digest,
    })
    expect(retried.kind).toBe('verified')
    expect(verify).toHaveBeenCalledTimes(2)
  })

  it('does not expose a receipt when the atomic verified commit fails', async () => {
    const { intake, store } = setup()
    store.commitError = new Error('transaction aborted')

    const state = await intake.accept(mission, submission())

    expect(state.kind).toBe('gateway-unavailable')
    expect(store.receipts.size).toBe(0)
    expect(store.raw.get('run-1')).toMatchObject({ status: 'gateway-unavailable' })
  })

  it('never adds a writable mastered transition to raw local evidence', async () => {
    const { intake, store } = setup()

    await intake.accept(mission, submission())

    expect(JSON.stringify([...store.raw.values()])).not.toMatch(/"mastered"\s*:/)
  })
})
