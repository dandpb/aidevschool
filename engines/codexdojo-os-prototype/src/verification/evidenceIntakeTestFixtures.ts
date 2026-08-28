import type { MissionDefinition } from '../domain'
import { EvidenceIntake } from './evidenceIntake'
import type {
  EvidenceSubmission,
  LiteracyVerificationReceipt,
  RawEvidenceEntry,
  StoredVerificationReceipt,
  TeachingGameVerificationReceipt,
  VerificationGateway,
  VerificationStore,
} from './ports'

export const digest = 'a'.repeat(64)

export const mission: MissionDefinition = {
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

export const voxelMission: MissionDefinition = {
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

export function submission(
  overrides: Partial<EvidenceSubmission['record']> = {},
): EvidenceSubmission {
  return {
    evidenceId: 'evidence-1',
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

export function receipt(
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

export function voxelReceipt(
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
    attempt_id: 'kv-warehouse-L1-attempt-1',
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

export function voxelSubmission(
  overrides: Partial<EvidenceSubmission['record']> = {},
): EvidenceSubmission {
  return {
    evidenceId: 'voxel-evidence-1',
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
    attempt_id: 'kv-warehouse-L1-attempt-1',
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
      .sort((left, right) =>
        right.acceptedAt.localeCompare(left.acceptedAt)
        || right.storageId.localeCompare(left.storageId)
      )[0]
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

export function setup(gateway?: VerificationGateway) {
  const store = new MemoryVerificationStore()
  const resolvedGateway = gateway ?? {
    async verify(request: EvidenceSubmission) {
      return request.schemaId === 'teaching-game-evidence' ? voxelReceipt() : receipt()
    },
  }
  return {
    store,
    intake: new EvidenceIntake({
      store,
      gateway: resolvedGateway,
      clock: () => new Date('2026-07-25T12:01:00.000Z'),
    }),
  }
}
