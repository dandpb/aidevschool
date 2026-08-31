import { describe, expect, it, vi } from 'vitest'
import {
  digest,
  setup,
  voxelMission,
  voxelReceipt,
  voxelSubmission,
  wormholeMission,
  wormholeReceipt,
  wormholeSubmission,
} from './evidenceIntakeTestFixtures'

describe('EvidenceIntake teaching-game evidence', () => {
  it('independently verifies teaching-game evidence through the schema-selected gateway', async () => {
    const verify = vi.fn(async () => voxelReceipt())
    const { intake, store } = setup({ verify })

    const accepted = await intake.accept(voxelMission, voxelSubmission())
    const restored = await intake.latest(voxelMission)
    const retried = await intake.retry(voxelMission)

    expect(accepted).toMatchObject({
      kind: 'verified',
      evidenceDigest: digest,
      receipt: {
        source: 'independent-teaching-game-verifier',
        verdict: 'PASS',
        canonical_gate_status: 'not-submitted',
      },
    })
    expect(restored).toEqual(accepted)
    expect(retried).toEqual(accepted)
    expect(store.raw.get('voxel-evidence-1')).toMatchObject({
      status: 'verified',
      schemaId: 'teaching-game-evidence',
    })
    expect(verify).toHaveBeenCalledOnce()
  })

  it('rejects malformed teaching-game evidence before persistence', async () => {
    const { intake, store } = setup()

    const state = await intake.accept(
      voxelMission,
      voxelSubmission({ project: 'wrong-project' }),
    )

    expect(state).toEqual({ kind: 'rejected', code: 'subject-record-mismatch' })
    expect(store.raw.size).toBe(0)
  })

  it('keeps the first verified teaching-game record when the same run id is delivered again', async () => {
    const { intake, store } = setup()
    const first = voxelSubmission()

    const accepted = await intake.accept(voxelMission, first)
    const duplicate = await intake.accept(voxelMission, voxelSubmission())
    const collision = await intake.accept(
      voxelMission,
      voxelSubmission({ scenario_id: 'kv-warehouse-L2' }),
    )

    expect(accepted.kind).toBe('verified')
    expect(duplicate).toEqual(accepted)
    expect(collision).toEqual({ kind: 'rejected', code: 'storage-id-collision' })
    expect(store.raw.get('voxel-evidence-1')?.record).toEqual(first.record)
  })

  it('accepts a PASS receipt for a hosted non-warehouse record without attempt_id', async () => {
    const verify = vi.fn(async () => wormholeReceipt())
    const { intake, store } = setup({ verify })

    const accepted = await intake.accept(wormholeMission, wormholeSubmission())

    expect(accepted).toMatchObject({
      kind: 'verified',
      evidenceDigest: digest,
      receipt: { verdict: 'PASS', game: 'WORMHOLE' },
    })
    expect(accepted.kind === 'verified' && accepted.receipt.attempt_id).toBeUndefined()
    expect(store.raw.get('voxel-evidence-1')).toMatchObject({ status: 'verified' })
    expect(await intake.latest(wormholeMission)).toEqual(accepted)
  })

  it('rejects a receipt that mints an attempt_id the record never carried', async () => {
    const verify = vi.fn(async () => wormholeReceipt({ attempt_id: 'wormhole-L1-attempt-9' }))
    const { intake, store } = setup({ verify })

    const state = await intake.accept(wormholeMission, wormholeSubmission())

    expect(state).toEqual({ kind: 'rejected', code: 'receipt-mismatch' })
    expect(store.raw.get('voxel-evidence-1')).toMatchObject({
      status: 'rejected',
      rejectionCode: 'receipt-mismatch',
    })
  })

  it.each([
    ['echoes an empty string', 'empty'] as const,
    ['omits the producer attempt_id', 'omitted'] as const,
  ])('still rejects a receipt that %s for a warehouse record that carried one', async (_label, mode) => {
    const { attempt_id: _carried, ...withoutAttemptId } = voxelReceipt()
    const verify = vi.fn(async () =>
      mode === 'empty' ? voxelReceipt({ attempt_id: '' }) : withoutAttemptId,
    )
    const { intake, store } = setup({ verify })

    const state = await intake.accept(voxelMission, voxelSubmission())

    expect(state).toEqual({ kind: 'rejected', code: 'receipt-mismatch' })
    expect(store.receipts.size).toBe(0)
  })

  it('persists a second WAREHOUSE attempt in the same mission run under its evidence id', async () => {
    const verify = vi.fn(async (request) => voxelReceipt({
      evidence_digest: request.record.pass === true ? 'b'.repeat(64) : 'c'.repeat(64),
      verdict: request.record.pass === true ? 'PASS' : 'FAIL',
      producer_pass_claim: request.record.pass === true,
      independent_pass: request.record.pass === true,
    }))
    const { intake, store } = setup({ verify })

    await intake.accept(voxelMission, voxelSubmission({ pass: false }))
    const retried = await intake.accept(voxelMission, {
      ...voxelSubmission({ pass: true }),
      evidenceId: 'voxel-evidence-2',
    })

    expect(retried).toMatchObject({ kind: 'verified', receipt: { verdict: 'PASS' } })
    expect(store.raw.get('voxel-evidence-1')).toMatchObject({
      missionRunId: 'voxel-run-1',
      record: { pass: false },
    })
    expect(store.raw.get('voxel-evidence-2')).toMatchObject({
      missionRunId: 'voxel-run-1',
      record: { pass: true },
    })
    expect(await intake.latest(voxelMission)).toEqual(retried)
    expect(verify).toHaveBeenCalledTimes(2)
  })
})
