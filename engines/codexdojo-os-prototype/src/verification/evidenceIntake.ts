import type { MissionDefinition } from '../domain'
import {
  EvidenceGatewayRejection,
  EvidenceValidationError,
  type EvidenceSubmission,
  type EvidenceVerificationState,
  type RawEvidenceEntry,
  type StoredVerificationReceipt,
  type VerificationGateway,
  type VerificationService,
  type VerificationStore,
} from './ports'
import { receiptIsBound } from './receiptContract'

type EvidenceIntakeDependencies = {
  readonly store: VerificationStore
  readonly gateway: VerificationGateway
  readonly clock: () => Date
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function verifiedState(stored: StoredVerificationReceipt): EvidenceVerificationState {
  return {
    kind: 'verified',
    evidenceDigest: stored.evidenceDigest,
    receipt: stored.receipt,
  }
}

export class EvidenceIntake implements VerificationService {
  constructor(private readonly dependencies: EvidenceIntakeDependencies) {}

  async accept(
    mission: MissionDefinition,
    submission: EvidenceSubmission,
    onState: (state: EvidenceVerificationState) => void = () => {},
  ): Promise<EvidenceVerificationState> {
    onState({ kind: 'validating' })
    try {
      this.correlate(mission, submission)
      const existing = await this.dependencies.store.getRaw(submission.missionRunId)
      if (existing?.evidenceDigest !== undefined) {
        const stored = await this.dependencies.store.getReceipt(existing.evidenceDigest)
        if (stored !== undefined) {
          const state = verifiedState(stored)
          onState(state)
          return state
        }
      }
      if (submission.schemaId === 'teaching-game-evidence') {
        if (existing !== undefined) {
          if (
            existing.missionVersion !== mission.version
            || JSON.stringify(existing.record) !== JSON.stringify(submission.record)
          ) {
            const state: EvidenceVerificationState = {
              kind: 'rejected',
              code: 'storage-id-collision',
            }
            onState(state)
            return state
          }
          const state: EvidenceVerificationState = {
            kind: 'pending',
            storageId: existing.storageId,
          }
          onState(state)
          return state
        }
        const pending: RawEvidenceEntry = {
          ...submission,
          storageId: submission.missionRunId,
          missionVersion: mission.version,
          acceptedAt: this.dependencies.clock().toISOString(),
          status: 'pending',
        }
        await this.dependencies.store.putRaw(pending)
        const state: EvidenceVerificationState = {
          kind: 'pending',
          storageId: pending.storageId,
        }
        onState(state)
        return state
      }
      return await this.verify({
        ...submission,
        storageId: submission.missionRunId,
        missionVersion: mission.version,
        acceptedAt: existing?.acceptedAt ?? this.dependencies.clock().toISOString(),
        status: 'pending',
      }, onState)
    } catch (error) {
      const state: EvidenceVerificationState = {
        kind: 'rejected',
        code: error instanceof EvidenceValidationError ? error.code : 'validation-failed',
      }
      onState(state)
      return state
    }
  }

  async latest(mission: MissionDefinition): Promise<EvidenceVerificationState> {
    const raw = await this.dependencies.store.latestForMission(mission.id)
    if (raw === undefined || raw.missionVersion !== mission.version) return { kind: 'not-submitted' }
    if (raw.evidenceDigest !== undefined) {
      const receipt = await this.dependencies.store.getReceipt(raw.evidenceDigest)
      if (receipt !== undefined) return verifiedState(receipt)
    }
    return raw.status === 'gateway-unavailable'
      ? { kind: 'gateway-unavailable', storageId: raw.storageId, retryable: true }
      : raw.status === 'rejected'
        ? { kind: 'rejected', code: raw.rejectionCode ?? 'verification-rejected' }
        : { kind: 'pending', storageId: raw.storageId }
  }

  async retry(
    mission: MissionDefinition,
    onState: (state: EvidenceVerificationState) => void = () => {},
  ): Promise<EvidenceVerificationState> {
    const raw = await this.dependencies.store.latestForMission(mission.id)
    if (raw === undefined || raw.missionVersion !== mission.version) {
      const state: EvidenceVerificationState = { kind: 'rejected', code: 'evidence-not-found' }
      onState(state)
      return state
    }
    if (raw.status === 'rejected') {
      const state: EvidenceVerificationState = {
        kind: 'rejected',
        code: raw.rejectionCode ?? 'verification-rejected',
      }
      onState(state)
      return state
    }
    if (raw.schemaId === 'teaching-game-evidence') {
      const state: EvidenceVerificationState = { kind: 'pending', storageId: raw.storageId }
      onState(state)
      return state
    }
    if (raw.evidenceDigest !== undefined) {
      const stored = await this.dependencies.store.getReceipt(raw.evidenceDigest)
      if (stored !== undefined) {
        const state = verifiedState(stored)
        onState(state)
        return state
      }
    }
    return this.verify({ ...raw, status: 'pending', evidenceDigest: undefined }, onState)
  }

  private correlate(mission: MissionDefinition, submission: EvidenceSubmission): void {
    if (
      submission.engineId !== mission.runtime.engineId
      || submission.subject.missionId !== mission.id
      || submission.subject.unitId !== mission.unitId
      || submission.schemaId !== mission.evidence.schema
      || submission.schemaVersion !== mission.evidence.version
      || submission.missionRunId.trim() === ''
    ) {
      throw new EvidenceValidationError('correlation-mismatch')
    }
    if (submission.schemaId === 'literacy-evidence') {
      if (
        submission.record.lessonId !== mission.id
        || submission.record.lessonVersion !== mission.version
      ) {
        throw new EvidenceValidationError('subject-record-mismatch')
      }
      return
    }
    const record = submission.record
    const reviewContext = record.review_context
    if (
      submission.schemaId !== 'teaching-game-evidence'
      || submission.engineId !== 'voxelDojo'
      || record.source !== 'voxeldojo'
      || record.unit_id !== mission.unitId
      || record.project !== mission.projectId
      || typeof record.scenario_id !== 'string'
      || record.scenario_id.trim() === ''
      || typeof record.game !== 'string'
      || record.game.trim() === ''
      || typeof record.ts !== 'string'
      || Number.isNaN(Date.parse(record.ts))
      || typeof record.pass !== 'boolean'
      || !isRecord(reviewContext)
      || reviewContext.verifier_required !== true
    ) {
      throw new EvidenceValidationError('subject-record-mismatch')
    }
  }

  private async verify(
    pending: RawEvidenceEntry,
    onState: (state: EvidenceVerificationState) => void,
  ): Promise<EvidenceVerificationState> {
    await this.dependencies.store.putRaw(pending)
    onState({ kind: 'pending', storageId: pending.storageId })
    try {
      const receipt = await this.dependencies.gateway.verify(pending)
      if (!receiptIsBound(receipt, pending.record)) {
        const state: EvidenceVerificationState = { kind: 'rejected', code: 'receipt-mismatch' }
        await this.dependencies.store.putRaw({
          ...pending,
          status: 'rejected',
          rejectionCode: state.code,
        })
        onState(state)
        return state
      }
      const evidenceDigest = receipt.evidence_digest
      const verifiedRaw: RawEvidenceEntry = {
        ...pending,
        status: 'verified',
        evidenceDigest,
      }
      const duplicate = await this.dependencies.store.getReceipt(evidenceDigest)
      if (duplicate !== undefined) {
        await this.dependencies.store.commitVerified(verifiedRaw, duplicate)
        const state = verifiedState(duplicate)
        onState(state)
        return state
      }
      const stored: StoredVerificationReceipt = {
        storageId: pending.storageId,
        evidenceDigest,
        missionId: pending.subject.missionId,
        missionVersion: pending.missionVersion,
        storedAt: this.dependencies.clock().toISOString(),
        receipt,
      }
      await this.dependencies.store.commitVerified(verifiedRaw, stored)
      const state = verifiedState(stored)
      onState(state)
      return state
    } catch (error) {
      if (error instanceof EvidenceGatewayRejection) {
        const state: EvidenceVerificationState = { kind: 'rejected', code: error.code }
        await this.dependencies.store.putRaw({
          ...pending,
          status: 'rejected',
          rejectionCode: state.code,
        })
        onState(state)
        return state
      }
      await this.dependencies.store.putRaw({ ...pending, status: 'gateway-unavailable' })
      const state: EvidenceVerificationState = {
        kind: 'gateway-unavailable',
        storageId: pending.storageId,
        retryable: true,
      }
      onState(state)
      return state
    }
  }
}
