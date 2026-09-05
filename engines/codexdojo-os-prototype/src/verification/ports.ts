import type { MissionDefinition } from '../domain'
import type { MissionEngineId } from '../host/protocol'

export type EvidenceSubject = {
  readonly missionId: string
  readonly unitId: string
}

export type EvidenceSubmission = {
  /** Stable id for this evidence delivery; retries in one mission run use distinct ids. */
  readonly evidenceId: string
  readonly schemaId: string
  readonly schemaVersion: number
  readonly engineId: MissionEngineId
  readonly missionRunId: string
  readonly subject: EvidenceSubject
  readonly record: Readonly<Record<string, unknown>>
}

export type LiteracyVerificationReceipt = {
  readonly verdict: 'PASS' | 'FAIL'
  readonly context_isolated: true
  readonly source: 'independent-literacy-verifier'
  readonly evidence_digest: string
  readonly lesson_id: string
  readonly activity_id: string
  readonly attempt_id?: string
  readonly activity_type: string
  readonly score: number | null
  readonly producer_pass_claim: boolean | null
  readonly independent_pass: boolean
  readonly mastery_eligible: boolean
  readonly errors: readonly string[]
  readonly producer_writes_mastered: false
  readonly max_producer_claim: 'completed'
}

export type TeachingGameVerificationReceipt = {
  readonly schema_version: 1
  readonly verdict: 'PASS' | 'FAIL'
  readonly context_isolated: true
  readonly source: 'independent-teaching-game-verifier'
  readonly evidence_digest: string
  readonly unit_id: string
  readonly project: string
  readonly scenario_id: string
  readonly game: string
  /** Present only when the verified record carried one; verifiers never mint ids. */
  readonly attempt_id?: string
  readonly producer_pass_claim: boolean | null
  readonly independent_pass: boolean
  readonly errors: readonly string[]
  readonly producer_writes_mastered: false
  readonly max_producer_claim: 'completed'
  readonly canonical_gate_status: 'not-submitted'
  readonly canonical_gate_reason: 'learner-attempt-and-gate-eligibility-required'
}

export type VerificationReceipt = LiteracyVerificationReceipt | TeachingGameVerificationReceipt

export type EvidenceVerificationState =
  | { readonly kind: 'not-submitted' }
  | { readonly kind: 'validating' }
  | { readonly kind: 'pending'; readonly storageId: string }
  | {
      readonly kind: 'verified'
      readonly evidenceDigest: string
      readonly receipt: VerificationReceipt
    }
  | { readonly kind: 'rejected'; readonly code: string }
  | {
      readonly kind: 'gateway-unavailable'
      readonly storageId: string
      readonly retryable: true
    }

export type RawEvidenceEntry = EvidenceSubmission & {
  readonly storageId: string
  readonly missionVersion: number
  readonly acceptedAt: string
  readonly status: 'pending' | 'gateway-unavailable' | 'rejected' | 'verified'
  readonly evidenceDigest?: string
  readonly rejectionCode?: string
}

export type StoredVerificationReceipt = {
  readonly storageId: string
  readonly evidenceDigest: string
  readonly missionId: string
  readonly missionVersion: number
  readonly storedAt: string
  readonly receipt: VerificationReceipt
}

export interface VerificationStore {
  getRaw(storageId: string): Promise<RawEvidenceEntry | undefined>
  latestForMission(missionId: string): Promise<RawEvidenceEntry | undefined>
  getReceipt(evidenceDigest: string): Promise<StoredVerificationReceipt | undefined>
  putRaw(entry: RawEvidenceEntry): Promise<void>
  commitVerified(raw: RawEvidenceEntry, receipt: StoredVerificationReceipt): Promise<void>
}

export interface VerificationGateway {
  verify(request: EvidenceSubmission): Promise<VerificationReceipt>
}

export interface VerificationService {
  accept(
    mission: MissionDefinition,
    submission: EvidenceSubmission,
    onState?: (state: EvidenceVerificationState) => void,
  ): Promise<EvidenceVerificationState>
  latest(mission: MissionDefinition): Promise<EvidenceVerificationState>
  retry(
    mission: MissionDefinition,
    onState?: (state: EvidenceVerificationState) => void,
  ): Promise<EvidenceVerificationState>
}

export class EvidenceValidationError extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'EvidenceValidationError'
  }
}

export class EvidenceGatewayRejection extends Error {
  constructor(readonly code: string) {
    super(code)
    this.name = 'EvidenceGatewayRejection'
  }
}
