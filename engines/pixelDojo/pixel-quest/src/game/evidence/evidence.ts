import type {
  PixelQuestCurriculumContext,
  PixelQuestEvidenceRecord,
  PixelQuestReviewContext,
} from "./types"

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvidenceValidationError"
  }
}

export function validateEvidenceRecord(raw: unknown): PixelQuestEvidenceRecord {
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence must be an object")
  }
  if (raw["source"] !== "pixelquest") {
    throw new EvidenceValidationError("evidence.source must be pixelquest")
  }
  const unitId = raw["unit_id"]
  if (typeof unitId !== "string" || unitId.trim() === "") {
    throw new EvidenceValidationError("evidence.unit_id is required")
  }
  const project = raw["project"]
  if (typeof project !== "string" || project.trim() === "") {
    throw new EvidenceValidationError("evidence.project is required")
  }
  const encounterId = raw["encounter_id"]
  if (typeof encounterId !== "string" || encounterId.trim() === "") {
    throw new EvidenceValidationError("evidence.encounter_id is required")
  }
  const game = raw["game"]
  if (game !== "PixelDojo Quest") {
    throw new EvidenceValidationError("evidence.game must be PixelDojo Quest")
  }
  const ts = raw["ts"]
  if (typeof ts !== "string" || Number.isNaN(Date.parse(ts))) {
    throw new EvidenceValidationError("evidence.ts must be an ISO timestamp")
  }
  const pass = raw["pass"]
  if (typeof pass !== "boolean") {
    throw new EvidenceValidationError("evidence.pass must be boolean")
  }
  const metrics = raw["metrics"]
  if (!isRecord(metrics)) {
    throw new EvidenceValidationError("evidence.metrics must be an object")
  }
  const evidenceRecord: PixelQuestEvidenceRecord = {
    source: "pixelquest",
    unit_id: unitId,
    project,
    encounter_id: encounterId,
    game: "PixelDojo Quest",
    ts,
    pass,
    metrics: {
      target_rate: readNumber(metrics, "target_rate"),
      observed_admit_rate: readNumber(metrics, "observed_admit_rate"),
      max_burst_1s: readNumber(metrics, "max_burst_1s"),
      good_admits: readNumber(metrics, "good_admits"),
      legit_rejected: readNumber(metrics, "legit_rejected"),
      abusive_admitted: readNumber(metrics, "abusive_admitted"),
      abusive_rejected: readNumber(metrics, "abusive_rejected"),
      heat_peak: readNumber(metrics, "heat_peak"),
      overheated: readBoolean(metrics, "overheated"),
    },
  }
  const reviewContext = readReviewContext(raw["review_context"])
  const curriculumContext = readCurriculumContext(raw["curriculum_context"])
  return {
    ...evidenceRecord,
    ...(reviewContext === undefined ? {} : { review_context: reviewContext }),
    ...(curriculumContext === undefined ? {} : { curriculum_context: curriculumContext }),
  }
}

function readCurriculumContext(raw: unknown): PixelQuestCurriculumContext | undefined {
  if (raw === undefined) {
    return undefined
  }
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence.curriculum_context must be an object")
  }
  return {
    concept: readNonEmptyString(raw, "curriculum_context.concept"),
    mechanic: readNonEmptyString(raw, "curriculum_context.mechanic"),
    accepted_signal: readNonEmptyString(raw, "curriculum_context.accepted_signal"),
    rejected_trap: readNonEmptyString(raw, "curriculum_context.rejected_trap"),
  }
}

function readReviewContext(raw: unknown): PixelQuestReviewContext | undefined {
  if (raw === undefined) {
    return undefined
  }
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence.review_context must be an object")
  }
  if (raw["unit_kind"] !== "concept") {
    throw new EvidenceValidationError("evidence.review_context.unit_kind must be concept")
  }
  const reviewReason = raw["review_reason"]
  if (
    reviewReason !== "due" &&
    reviewReason !== "overdue" &&
    reviewReason !== "interleaving" &&
    reviewReason !== "recurring-trap"
  ) {
    throw new EvidenceValidationError("evidence.review_context.review_reason is invalid")
  }
  if (raw["scheduler_source"] !== "learner-substrate") {
    throw new EvidenceValidationError(
      "evidence.review_context.scheduler_source must be learner-substrate",
    )
  }
  if (raw["verifier_required"] !== true) {
    throw new EvidenceValidationError("evidence.review_context.verifier_required must be true")
  }
  return {
    unit_kind: "concept",
    scheduled_review: readBoolean(raw, "scheduled_review"),
    review_reason: reviewReason,
    streak_candidate: readBoolean(raw, "streak_candidate"),
    scheduler_source: "learner-substrate",
    verifier_required: true,
  }
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new EvidenceValidationError(`evidence.metrics.${key} must be a finite number`)
  }
  return value
}

function readNonEmptyString(source: Record<string, unknown>, key: string): string {
  const property = key.split(".").at(-1)
  const value = property === undefined ? undefined : source[property]
  if (typeof value !== "string" || value.trim() === "") {
    throw new EvidenceValidationError(`evidence.${key} must be a non-empty string`)
  }
  return value
}

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key]
  if (typeof value !== "boolean") {
    throw new EvidenceValidationError(`evidence.metrics.${key} must be boolean`)
  }
  return value
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
}
