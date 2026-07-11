import { EvidenceValidationError, validateEvidenceEnvelope } from "@aidevschool/evidence"
import type { PixelQuestEvidenceMetrics, PixelQuestEvidenceRecord } from "./types"

const REVIEW_REASONS = ["due", "overdue", "interleaving", "recurring-trap"] as const

export { EvidenceValidationError }

export function validateEvidenceRecord(raw: unknown): PixelQuestEvidenceRecord {
  return validateEvidenceEnvelope(raw, {
    source: "pixelquest",
    game: "PixelDojo Quest",
    identityKey: "encounter_id",
    reviewReasons: REVIEW_REASONS,
    requireStreakCandidate: true,
    requireCurriculumSignals: true,
    decodeMetrics: readMetrics,
  })
}

function readMetrics(source: Record<string, unknown>): PixelQuestEvidenceMetrics {
  const kind = source["kind"]
  if (kind === "pixelquest-token-bucket") return readTokenBucketMetrics(source)
  if (kind === "pixelquest-route-health") return readRouteHealthMetrics(source)
  if (kind === "pixelquest-policy-gate") return readPolicyGateMetrics(source)
  if (kind === "pixelquest-sequence-flow") return readSequenceMetrics(source)
  if (kind === "pixelquest-task-queue") return readTaskQueueMetrics(source)
  throw new EvidenceValidationError("evidence.metrics.kind must be a known evidence kind")
}

function readTokenBucketMetrics(source: Record<string, unknown>): PixelQuestEvidenceMetrics {
  return {
    kind: "pixelquest-token-bucket",
    target_rate: readNumber(source, "target_rate"),
    observed_admit_rate: readNumber(source, "observed_admit_rate"),
    max_burst_1s: readNumber(source, "max_burst_1s"),
    good_admits: readNumber(source, "good_admits"),
    legit_rejected: readNumber(source, "legit_rejected"),
    abusive_admitted: readNumber(source, "abusive_admitted"),
    abusive_rejected: readNumber(source, "abusive_rejected"),
    heat_peak: readNumber(source, "heat_peak"),
    overheated: readBoolean(source, "overheated"),
  }
}

function readRouteHealthMetrics(source: Record<string, unknown>): PixelQuestEvidenceMetrics {
  return {
    kind: "pixelquest-route-health",
    routed: readNumber(source, "routed"),
    isolated: readNumber(source, "isolated"),
    bad_routes: readNumber(source, "bad_routes"),
    good_rejected: readNumber(source, "good_rejected"),
    heat_peak: readNumber(source, "heat_peak"),
    overheated: readBoolean(source, "overheated"),
  }
}

function readPolicyGateMetrics(source: Record<string, unknown>): PixelQuestEvidenceMetrics {
  return {
    kind: "pixelquest-policy-gate",
    allowed: readNumber(source, "allowed"),
    denied: readNumber(source, "denied"),
    policy_leaks: readNumber(source, "policy_leaks"),
    false_denies: readNumber(source, "false_denies"),
    heat_peak: readNumber(source, "heat_peak"),
    overheated: readBoolean(source, "overheated"),
  }
}

function readSequenceMetrics(source: Record<string, unknown>): PixelQuestEvidenceMetrics {
  return {
    kind: "pixelquest-sequence-flow",
    advanced: readNumber(source, "advanced"),
    held: readNumber(source, "held"),
    skipped_required: readNumber(source, "skipped_required"),
    guards_missed: readNumber(source, "guards_missed"),
    heat_peak: readNumber(source, "heat_peak"),
    overheated: readBoolean(source, "overheated"),
  }
}

function readTaskQueueMetrics(source: Record<string, unknown>): PixelQuestEvidenceMetrics {
  return {
    kind: "pixelquest-task-queue",
    processed: readNumber(source, "processed"),
    poison_dead_lettered: readNumber(source, "poison_dead_lettered"),
    poison_retried: readNumber(source, "poison_retried"),
    legit_retried: readNumber(source, "legit_retried"),
    backpressure_peak: readNumber(source, "backpressure_peak"),
    overheated: readBoolean(source, "overheated"),
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

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key]
  if (typeof value !== "boolean") {
    throw new EvidenceValidationError(`evidence.metrics.${key} must be boolean`)
  }
  return value
}
