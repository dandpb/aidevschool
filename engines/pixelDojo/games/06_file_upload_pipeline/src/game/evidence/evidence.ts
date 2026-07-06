import type {
  ByteStreamEvidenceRecord,
  ByteStreamMetrics,
  CurriculumContext,
  ReviewContext,
} from "./types"

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvidenceValidationError"
  }
}

// Validate a record at emission time. Malformed records are never written to
// the durable channel — producer invariant.
export function validateEvidenceRecord(raw: unknown): ByteStreamEvidenceRecord {
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence must be an object")
  }
  if (raw["source"] !== "threejs-dojo") {
    throw new EvidenceValidationError("evidence.source must be threejs-dojo")
  }
  if (raw["unit_id"] !== "06_file_upload_pipeline") {
    throw new EvidenceValidationError("evidence.unit_id must be 06_file_upload_pipeline")
  }
  if (raw["project"] !== "06_file_upload_pipeline") {
    throw new EvidenceValidationError("evidence.project must be 06_file_upload_pipeline")
  }
  const encounterId = raw["encounter_id"]
  if (typeof encounterId !== "string" || encounterId.trim() === "") {
    throw new EvidenceValidationError("evidence.encounter_id is required")
  }
  if (raw["game"] !== "Byte Stream Reactor") {
    throw new EvidenceValidationError("evidence.game must be Byte Stream Reactor")
  }
  const ts = raw["ts"]
  if (typeof ts !== "string" || Number.isNaN(Date.parse(ts))) {
    throw new EvidenceValidationError("evidence.ts must be an ISO timestamp")
  }
  if (typeof raw["pass"] !== "boolean") {
    throw new EvidenceValidationError("evidence.pass must be boolean")
  }
  const metricsRaw = raw["metrics"]
  if (!isRecord(metricsRaw)) {
    throw new EvidenceValidationError("evidence.metrics must be an object")
  }
  const metrics = readMetrics(metricsRaw)
  const curriculum = readCurriculum(raw["curriculum_context"])
  const review = readReview(raw["review_context"])
  return {
    source: "threejs-dojo",
    unit_id: "06_file_upload_pipeline",
    project: "06_file_upload_pipeline",
    encounter_id: encounterId,
    game: "Byte Stream Reactor",
    ts,
    pass: raw["pass"],
    metrics,
    curriculum_context: curriculum,
    review_context: review,
  }
}

function readMetrics(source: Record<string, unknown>): ByteStreamMetrics {
  if (source["kind"] !== "threejs-byte-stream") {
    throw new EvidenceValidationError("evidence.metrics.kind must be threejs-byte-stream")
  }
  return {
    kind: "threejs-byte-stream",
    files_completed: readNumber(source, "files_completed"),
    files_target: readNumber(source, "files_target"),
    bytes_streamed: readNumber(source, "bytes_streamed"),
    buffer_capacity_chunks: readNumber(source, "buffer_capacity_chunks"),
    buffer_peak_chunks: readNumber(source, "buffer_peak_chunks"),
    buffer_overflows: readNumber(source, "buffer_overflows"),
    whole_file_trap_used: readBoolean(source, "whole_file_trap_used"),
    invalid_chunks_leaked: readNumber(source, "invalid_chunks_leaked"),
    size_cap_violations: readNumber(source, "size_cap_violations"),
    hasher_match: readBoolean(source, "hasher_match"),
    cancellations: readNumber(source, "cancellations"),
    throughput_mbps: readNumber(source, "throughput_mbps"),
  }
}

function readCurriculum(raw: unknown): CurriculumContext {
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence.curriculum_context must be an object")
  }
  return {
    concept: readNonEmptyString(raw, "concept"),
    mechanic: readNonEmptyString(raw, "mechanic"),
    accepted_signal: readNonEmptyString(raw, "accepted_signal"),
    rejected_trap: readNonEmptyString(raw, "rejected_trap"),
  }
}

function readReview(raw: unknown): ReviewContext {
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence.review_context must be an object")
  }
  if (raw["unit_kind"] !== "concept") {
    throw new EvidenceValidationError("evidence.review_context.unit_kind must be concept")
  }
  const reason = raw["review_reason"]
  if (
    reason !== "due" &&
    reason !== "overdue" &&
    reason !== "interleaving" &&
    reason !== "recurring-trap"
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
    review_reason: reason,
    streak_candidate: readBoolean(raw, "streak_candidate"),
    scheduler_source: "learner-substrate",
    verifier_required: true,
  }
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new EvidenceValidationError(
      `evidence.metrics.${key} must be a finite, non-negative number`,
    )
  }
  return value
}

function readNonEmptyString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  if (typeof value !== "string" || value.trim() === "") {
    throw new EvidenceValidationError(`evidence.curriculum_context.${key} must be non-empty`)
  }
  return value
}

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key]
  if (typeof value !== "boolean") {
    throw new EvidenceValidationError(`evidence field ${key} must be boolean`)
  }
  return value
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
}
