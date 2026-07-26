import type {
  LiteracyVerificationReceipt,
  TeachingGameVerificationReceipt,
  VerificationReceipt,
} from './ports'

const SHA256_HEX = /^[0-9a-f]{64}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function literacyReceiptShapeIsValid(value: Record<string, unknown>): value is LiteracyVerificationReceipt {
  return (
    (value.verdict === 'PASS' || value.verdict === 'FAIL')
    && value.context_isolated === true
    && value.source === 'independent-literacy-verifier'
    && typeof value.evidence_digest === 'string'
    && SHA256_HEX.test(value.evidence_digest)
    && typeof value.lesson_id === 'string'
    && typeof value.activity_id === 'string'
    && typeof value.attempt_id === 'string'
    && typeof value.activity_type === 'string'
    && (value.score === null || (typeof value.score === 'number' && Number.isFinite(value.score)))
    && (value.producer_pass_claim === null || typeof value.producer_pass_claim === 'boolean')
    && typeof value.independent_pass === 'boolean'
    && typeof value.mastery_eligible === 'boolean'
    && isStringArray(value.errors)
    && value.producer_writes_mastered === false
    && value.max_producer_claim === 'completed'
  )
}

function teachingGameReceiptShapeIsValid(
  value: Record<string, unknown>,
): value is TeachingGameVerificationReceipt {
  return (
    value.schema_version === 1
    && (value.verdict === 'PASS' || value.verdict === 'FAIL')
    && value.context_isolated === true
    && value.source === 'independent-teaching-game-verifier'
    && typeof value.evidence_digest === 'string'
    && SHA256_HEX.test(value.evidence_digest)
    && typeof value.unit_id === 'string'
    && typeof value.project === 'string'
    && typeof value.scenario_id === 'string'
    && typeof value.game === 'string'
    && (value.producer_pass_claim === null || typeof value.producer_pass_claim === 'boolean')
    && typeof value.independent_pass === 'boolean'
    && isStringArray(value.errors)
    && value.producer_writes_mastered === false
    && value.max_producer_claim === 'completed'
    && value.canonical_gate_status === 'not-submitted'
    && value.canonical_gate_reason === 'learner-attempt-and-gate-eligibility-required'
  )
}

/** Shape of a verifier receipt, independent of which record produced it. */
export function receiptShapeIsValid(value: unknown): value is VerificationReceipt {
  return (
    isRecord(value)
    && (literacyReceiptShapeIsValid(value) || teachingGameReceiptShapeIsValid(value))
  )
}

/** Identity binding: the receipt describes exactly the record that was submitted. */
export function receiptIsBound(
  receipt: unknown,
  record: Readonly<Record<string, unknown>>,
): receipt is VerificationReceipt {
  if (!receiptShapeIsValid(receipt)) return false
  if (receipt.source === 'independent-literacy-verifier') {
    return (
      receipt.lesson_id === record.lessonId
      && receipt.activity_id === record.activityId
      && receipt.attempt_id === record.attemptId
      && receipt.activity_type === record.activityType
      && receipt.score === record.score
      && receipt.producer_pass_claim === record.pass
    )
  }
  return (
    receipt.unit_id === record.unit_id
    && receipt.project === record.project
    && receipt.scenario_id === record.scenario_id
    && receipt.game === record.game
    && receipt.producer_pass_claim === record.pass
  )
}
