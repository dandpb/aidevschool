import { describe, expect, it, vi } from 'vitest'
import {
  digest,
  setup,
  voxelMission,
  voxelReceipt,
  voxelSubmission,
} from './evidenceIntakeTestFixtures'

describe('EvidenceIntake teaching-game evidence', () => {
  it('verifies the newest teaching-game attempt after a failed attempt in the same mission run', async () => {
    // Given a failed attempt followed by a corrected attempt in one hosted mission run
    const { intake, store } = setup({
      async verify(request) {
        const pass = request.record.pass === true
        return voxelReceipt({
          verdict: pass ? 'PASS' : 'FAIL',
          evidence_digest: pass ? digest : 'b'.repeat(64),
          producer_pass_claim: pass,
          independent_pass: pass,
        })
      },
    })
    const failed = voxelSubmission({ pass: false })
    const corrected = voxelSubmission({ pass: true, ts: '2026-07-25T12:02:00.000Z' })

    // When the corrected attempt is accepted
    await intake.accept(voxelMission, failed)
    const accepted = await intake.accept(voxelMission, corrected)

    // Then it supersedes the failed attempt for the mission status
    expect(accepted).toMatchObject({ kind: 'verified', receipt: { verdict: 'PASS' } })
    expect(await intake.latest(voxelMission)).toEqual(accepted)
    expect(store.raw.size).toBe(2)
  })

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
    expect(store.raw.get('voxel-run-1:2026-07-25T12:00:00.000Z')).toMatchObject({
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
    expect(store.raw.get('voxel-run-1:2026-07-25T12:00:00.000Z')?.record).toEqual(first.record)
  })
})
