import { dualEmit } from "../../../../shared/evidence"
// Posting Lattice evidence emitter — producer side of the EVIDENCE_CONTRACT.md
// pattern. Validates, builds, and publishes the evidence record to:
//
//   - console.log("EVIDENCE " + JSON.stringify(rec))   — stdout-scrapable
//   - window.__gameEvidence                            — single latest record
//   - window.__postingLatticeEvidence                  — append-only channel
//
// The game never writes learner state. The verifier owns mastery.

import type { GateCheck, Metrics } from "./search"
import { gateChecks, passRule } from "./search"

export const SCHEMA_VERSION = "18_search_engine-v1"
export const SOURCE_LITERAL = "postinglattice"
export const GAME_LITERAL = "Posting Lattice"
export const UNIT_ID = "18_search_engine"
export const PROJECT = "18_search_engine"
export const ENCOUNTER_ID = "posting-lattice-01"

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

export const POSTING_LATTICE_CURRICULUM_CONTEXT: CurriculumContext = {
  concept:
    "inverted index with positional postings, phrase adjacency, and boolean query evaluation under precedence (parens > NOT > AND > OR)",
  mechanic: "Posting Lattice",
  accepted_signal:
    "query orb classified MATCH only when its inverted-index evaluation retrieves the target document",
  rejected_trap:
    "surface-form trap (OR over a doc with neither term, NOT excluding a doc that contains the negated term) wrongly admitted as a match",
}

export const POSTING_LATTICE_REVIEW_CONTEXT: ReviewContext = {
  unit_kind: "concept",
  scheduled_review: false,
  review_reason: "deepening",
  streak_candidate: false,
  scheduler_source: "learner-substrate",
  verifier_required: true,
}

export function buildEvidence(metrics: Metrics, now: Date): EvidenceRecord {
  const gates = gateChecks(metrics)
  const passed = passRule(metrics)
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
    curriculum_context: POSTING_LATTICE_CURRICULUM_CONTEXT,
    review_context: POSTING_LATTICE_REVIEW_CONTEXT,
  }
}

declare global {
  interface Window {
    __gameEvidence?: EvidenceRecord
    __postingLatticeEvidence?: EvidenceRecord[]
  }
}

// Publish the record to every contract channel. Validates that all required
// fields are present so a malformed record never reaches the verifier.
export function emitEvidence(record: EvidenceRecord): EvidenceRecord {
  return dualEmit(record, "game")
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
  if (raw["metrics"]["kind"] !== "threejs-posting-lattice") {
    throw new EvidenceValidationError("evidence.metrics.kind must be threejs-posting-lattice")
  }
  const metrics = raw["metrics"]
  for (const key of [
    "orbs_classified",
    "matches_correct",
    "matches_wrong",
    "rejects_correct",
    "rejects_wrong",
    "terms_indexed",
    "documents_indexed",
    "average_document_length",
    "bm25_top_score",
    "query_parse_errors",
    "index_lookup_p95_ms",
    "parse_p95_ms",
  ] as const) {
    readNumber(metrics, key)
  }
}
