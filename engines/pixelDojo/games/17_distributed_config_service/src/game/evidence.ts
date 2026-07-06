// Quorum Citadel evidence emitter — producer side of the EVIDENCE_CONTRACT.md
// pattern. Validates, builds, and publishes the evidence record to:
//
//   - console.log("EVIDENCE " + JSON.stringify(rec))   — stdout-scrapable
//   - window.__gameEvidence                            — single latest record
//   - window.__quorumDojoEvidence                      — append-only channel
//
// The game never writes learner state. The verifier owns mastery.

import type { GateCheck, Metrics } from "./quorum"
import { gateChecks, passRule } from "./quorum"

export const SCHEMA_VERSION = "17_distributed_config_service-v1"
export const SOURCE_LITERAL = "quorumdoj"
export const GAME_LITERAL = "Quorum Citadel"
export const UNIT_ID = "17_distributed_config_service"
export const PROJECT = "17_distributed_config_service"
export const ENCOUNTER_ID = "quorum-citadel-01"

export type CurriculumContext = {
  readonly concept: string
  readonly mechanic: string
  readonly accepted_signal: string
  readonly rejected_trap: string
}

export type ReviewContext = {
  readonly unit_kind: "concept"
  readonly scheduled_review: false
  readonly review_reason: "deepening"
  readonly streak_candidate: false
  readonly scheduler_source: "learner-substrate"
  readonly verifier_required: true
}

export type EvidenceRecord = {
  readonly schema: typeof SCHEMA_VERSION
  readonly source: typeof SOURCE_LITERAL
  readonly unit_id: typeof UNIT_ID
  readonly project: typeof PROJECT
  readonly encounter_id: typeof ENCOUNTER_ID
  readonly game: typeof GAME_LITERAL
  readonly ts: string
  readonly pass: boolean
  readonly metrics: Metrics
  readonly gates: readonly GateCheck[]
  readonly curriculum_context: CurriculumContext
  readonly review_context: ReviewContext
}

export const QUORUM_CURRICULUM_CONTEXT: CurriculumContext = {
  concept: "consensus-backed distributed config writes with observable watch/notify",
  mechanic: "Quorum Citadel",
  accepted_signal: "write commits after quorum ack, watchers notified in budget",
  rejected_trap:
    "commit without quorum (split-brain), notify late/missed, unauthorized write allowed, stale read served",
}

export const QUORUM_REVIEW_CONTEXT: ReviewContext = {
  unit_kind: "concept",
  scheduled_review: false,
  review_reason: "deepening",
  streak_candidate: false,
  scheduler_source: "learner-substrate",
  verifier_required: true,
}

export function buildEvidence(metrics: Metrics, target: number, now: Date): EvidenceRecord {
  const gates = gateChecks(metrics, target)
  const passed = passRule(metrics, target)
  return {
    schema: SCHEMA_VERSION,
    source: SOURCE_LITERAL,
    unit_id: UNIT_ID,
    project: PROJECT,
    encounter_id: ENCOUNTER_ID,
    game: GAME_LITERAL,
    ts: now.toISOString(),
    pass: passed,
    metrics,
    gates,
    curriculum_context: QUORUM_CURRICULUM_CONTEXT,
    review_context: QUORUM_REVIEW_CONTEXT,
  }
}

declare global {
  interface Window {
    __gameEvidence?: EvidenceRecord
    __quorumDojoEvidence?: EvidenceRecord[]
  }
}

// Publish the record to every contract channel. Validates that all required
// fields are present so a malformed record never reaches the verifier.
export function emitEvidence(record: EvidenceRecord): EvidenceRecord {
  validateEvidenceRecord(record)
  if (typeof window !== "undefined") {
    window.__gameEvidence = record
    window.__quorumDojoEvidence = [...(window.__quorumDojoEvidence ?? []), record]
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvidenceValidationError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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

export function validateEvidenceRecord(raw: unknown): asserts raw is EvidenceRecord {
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence must be an object")
  }
  if (raw["schema"] !== SCHEMA_VERSION) {
    throw new EvidenceValidationError(`evidence.schema must be ${SCHEMA_VERSION}`)
  }
  if (raw["source"] !== SOURCE_LITERAL) {
    throw new EvidenceValidationError(`evidence.source must be ${SOURCE_LITERAL}`)
  }
  if (raw["unit_id"] !== UNIT_ID) {
    throw new EvidenceValidationError(`evidence.unit_id must be ${UNIT_ID}`)
  }
  if (raw["project"] !== PROJECT) {
    throw new EvidenceValidationError(`evidence.project must be ${PROJECT}`)
  }
  if (raw["encounter_id"] !== ENCOUNTER_ID) {
    throw new EvidenceValidationError(`evidence.encounter_id must be ${ENCOUNTER_ID}`)
  }
  if (raw["game"] !== GAME_LITERAL) {
    throw new EvidenceValidationError(`evidence.game must be ${GAME_LITERAL}`)
  }
  const ts = raw["ts"]
  if (typeof ts !== "string" || Number.isNaN(Date.parse(ts))) {
    throw new EvidenceValidationError("evidence.ts must be an ISO timestamp")
  }
  if (typeof raw["pass"] !== "boolean") {
    throw new EvidenceValidationError("evidence.pass must be boolean")
  }
  if (!isRecord(raw["metrics"])) {
    throw new EvidenceValidationError("evidence.metrics must be an object")
  }
  if (raw["metrics"]["kind"] !== "threejs-quorum-consensus") {
    throw new EvidenceValidationError("evidence.metrics.kind must be threejs-quorum-consensus")
  }
  // Touch every metric field so a missing key is caught at emission time.
  const metrics = raw["metrics"]
  for (const key of [
    "writes_proposed",
    "writes_committed_quorum",
    "writes_committed_no_quorum",
    "writes_rejected_partition",
    "partition_events_total",
    "writes_rejected_acl",
    "acl_leaked",
    "watchers_subscribed",
    "watchers_notified_in_budget",
    "watchers_notified_late",
    "watchers_missed",
    "fresh_reads_served",
    "stale_reads_served",
    "rollbacks_committed",
    "leader_failovers_handled",
    "consensus_p95_ms",
    "watch_notify_p95_ms",
    "monolith_damage",
  ] as const) {
    readNumber(metrics, key)
  }
}
