import { describe, expect, it, vi } from 'vitest'
import type { MissionDefinition } from '../domain'
import { EvidenceIntake } from './evidenceIntake'
import {
  EvidenceGatewayRejection,
  type EvidenceSubmission,
  type LiteracyVerificationReceipt,
  type RawEvidenceEntry,
  type StoredVerificationReceipt,
  type TeachingGameVerificationReceipt,
  type VerificationGateway,
  type VerificationStore,
} from './ports'

const digest = 'a'.repeat(64)
const mission: MissionDefinition = {
  id: 'l02',
  version: 3,
  trackId: 'ai-pratica',
  unitId: 'ai-literacy:l02',
  projectId: '00_ai_in_practice',
  title: 'IA não é uma fonte de verdade',
  objective: 'Verificar antes de usar.',
  estimatedMinutes: 4,
  chapterOrder: 2,
  prerequisites: [],
  stages: ['understand', 'respond', 'apply'],
  runtime: {
    engineId: 'literacyDojo',
    entrypoint: 'http://127.0.0.1:5178',
    environmentKey: 'VITE_LITERACYDOJO_URL',
    protocolVersion: '1.0',
    contentVersion: 'test.1',
  },
  evidence: { schema: 'literacy-evidence', version: 1, verifierRequired: true },
  fallback: { kind: 'dom', summary: 'Resumo.' },
}

const voxelMission: MissionDefinition = {
  id: 'game-02-warehouse',
  version: 1,
  trackId: 'dev',
  unitId: 'U2-key-value-store',
  projectId: '02_key_value_store',
  title: 'KV Warehouse',
  objective: 'Prever a prateleira.',
  estimatedMinutes: 12,
  chapterOrder: 1,
  prerequisites: [],
  stages: ['understand', 'respond', 'apply'],
  runtime: {
    engineId: 'voxelDojo',
    entrypoint: 'http://127.0.0.1:5202',
    environmentKey: 'VITE_WAREHOUSE_URL',
    protocolVersion: '1.0',
    contentVersion: 'game-02-warehouse@0.1.0',
  },
  evidence: { schema: 'teaching-game-evidence', version: 1, verifierRequired: true },
  fallback: { kind: 'dom', summary: 'Resumo.' },
}

function submission(overrides: Partial<EvidenceSubmission['record']> = {}): EvidenceSubmission {
  return {
    schemaId: 'literacy-evidence',
    schemaVersion: 1,
    engineId: 'literacyDojo',
    missionRunId: 'run-1',
    subject: { missionId: 'l02', unitId: 'ai-literacy:l02' },
    record: {
      schemaVersion: 1,
      source: 'literacydojo',
      attemptId: 'attempt-1',
      lessonId: 'l02',
      lessonVersion: 3,
      activityId: 'l02-a1',
      activityType: 'output_comparison',
      skillIds: ['avaliar'],
      deterministicChecks: { confidence: 1e-7, sources: true },
      score: 1,
      pass: true,
      timestamp: '2026-07-25T12:00:00.000Z',
      verifierRequired: true,
      context: 'initial',
      ...overrides,
    },
  }
}

function receipt(
  overrides: Partial<LiteracyVerificationReceipt> = {},
): LiteracyVerificationReceipt {
  return {
    verdict: 'PASS',
    context_isolated: true,
    source: 'independent-literacy-verifier',
    evidence_digest: digest,
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
    ...overrides,
  }
}

function voxelReceipt(
  overrides: Partial<TeachingGameVerificationReceipt> = {},
): TeachingGameVerificationReceipt {
  return {
    schema_version: 1,
    verdict: 'PASS',
    context_isolated: true,
    source: 'independent-teaching-game-verifier',
    evidence_digest: digest,
    unit_id: 'U2-key-value-store',
    project: '02_key_value_store',
    scenario_id: 'kv-warehouse-L1',
    game: 'KV WAREHOUSE',
    producer_pass_claim: true,
    independent_pass: true,
    errors: [],
    producer_writes_mastered: false,
    max_producer_claim: 'completed',
    canonical_gate_status: 'not-submitted',
    canonical_gate_reason: 'learner-attempt-and-gate-eligibility-required',
    ...overrides,
  }
}

function voxelSubmission(
  overrides: Partial<EvidenceSubmission['record']> = {},
): EvidenceSubmission {
  return {
    schemaId: 'teaching-game-evidence',
    schemaVersion: 1,
    engineId: 'voxelDojo',
    missionRunId: 'voxel-run-1',
    subject: {
      missionId: 'game-02-warehouse',
      unitId: 'U2-key-value-store',
    },
    record: {
      source: 'voxeldojo',
      unit_id: 'U2-key-value-store',
      project: '02_key_value_store',
      scenario_id: 'kv-warehouse-L1',
      game: 'KV WAREHOUSE',
      ts: '2026-07-25T12:00:00.000Z',
      pass: true,
      metrics: { correct: 5 },
      review_context: {
        verifier_required: true,
      },
      ...overrides,
    },
  }
}

class MemoryVerificationStore implements VerificationStore {
  readonly raw = new Map<string, RawEvidenceEntry>()
  readonly receipts = new Map<string, StoredVerificationReceipt>()
  commitError: Error | undefined

  async getRaw(storageId: string) {
    return this.raw.get(storageId)
  }

  async latestForMission(missionId: string) {
    return [...this.raw.values()]
      .filter((entry) => entry.subject.missionId === missionId)
      .sort((left, right) => right.acceptedAt.localeCompare(left.acceptedAt))[0]
  }

  async getReceipt(evidenceDigest: string) {
    return this.receipts.get(evidenceDigest)
  }

  async putRaw(entry: RawEvidenceEntry) {
    this.raw.set(entry.storageId, entry)
  }

  async commitVerified(raw: RawEvidenceEntry, stored: StoredVerificationReceipt) {
    if (this.commitError !== undefined) throw this.commitError
    this.raw.set(raw.storageId, raw)
    this.receipts.set(stored.evidenceDigest, stored)
  }
}

function setup(gateway?: VerificationGateway) {
  const store = new MemoryVerificationStore()
  const resolvedGateway = gateway ?? {
    async verify(request: EvidenceSubmission) {
      return request.schemaId === 'teaching-game-evidence' ? voxelReceipt() : receipt()
    },
  }
  return {
    store,
    gateway: resolvedGateway,
    intake: new EvidenceIntake({
      store,
      gateway: resolvedGateway,
      clock: () => new Date('2026-07-25T12:01:00.000Z'),
    }),
  }
}

describe('EvidenceIntake', () => {
  it('accepts exponent-valued evidence without computing or sending a browser digest', async () => {
    const verify = vi.fn(async (request: EvidenceSubmission) => {
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

    expect(store.raw.get('run-1')).toMatchObject({
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
    expect(store.raw.get('run-1')).toMatchObject({
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
  ] as const)('serializes %s simultaneous submissions with the same run id', async (
    _delivery,
    context,
    expected,
  ) => {
    let releaseGateway!: () => void
    const verify = vi.fn(async () => {
      await new Promise<void>((resolve) => { releaseGateway = resolve })
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
      expected === 'verified'
        ? accepted
        : { kind: 'rejected', code: 'storage-id-collision' },
    )
    expect(store.raw.get('run-1')?.record).toEqual(firstSubmission.record)
    expect(verify).toHaveBeenCalledOnce()
  })

  it('preserves raw evidence under a stable opaque id and retries after gateway failure', async () => {
    const verify = vi.fn()
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
    expect(store.raw.get('voxel-run-1')).toMatchObject({
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
    expect(store.raw.get('voxel-run-1')?.record).toEqual(first.record)
  })
})
