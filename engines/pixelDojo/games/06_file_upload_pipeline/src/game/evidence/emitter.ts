import type { WaveMetrics } from "../logic"
import { validateEvidenceRecord } from "./evidence"
import type { ByteStreamEvidenceRecord } from "./types"
import { dualEmit } from "../../../../../shared/evidence"

// Byte Stream Reactor evidence emitter (input for engines/pixelDojo/verifier).
//
// Durable channel: the Playwright smoke run captures the append-only
// `window.__byteStreamEvidence` array at the end of the run and persists it
// as NDJSON. The plan also publishes a single PASS record via the legacy
// `EVIDENCE <json>` console line for stdout-scraping harnesses, and the
// `window.__gameEvidence` single-record slot.
//
// Golden rule: the game emits evidence only. It never writes learner state;
// engines/pixelDojo/verifier consumes the NDJSON and decides the gate.

export type BuildEvidenceInput = {
  readonly encounterId: string
  readonly pass: boolean
  readonly metrics: WaveMetrics
  readonly now: Date
}

const CURRICULUM_CONTEXT = {
  concept: "Streaming I/O with bounded memory for large file handling",
  mechanic: "Byte Stream Reactor (chunk-cannon + bounded buffer + pipeline lanes)",
  accepted_signal: "chunked streaming kept buffer peak < capacity, hasher matched",
  rejected_trap: "whole-file buffering (X) overflows memory",
} as const

const REVIEW_CONTEXT = {
  unit_kind: "concept",
  scheduled_review: true,
  review_reason: "due",
  streak_candidate: true,
  scheduler_source: "learner-substrate",
  verifier_required: true,
} as const

export function buildEvidenceRecord(input: BuildEvidenceInput): ByteStreamEvidenceRecord {
  const record: ByteStreamEvidenceRecord = {
    source: "threejs-dojo",
    unit_id: "06_file_upload_pipeline",
    project: "06_file_upload_pipeline",
    encounter_id: input.encounterId,
    game: "Byte Stream Reactor",
    ts: input.now.toISOString(),
    pass: input.pass,
    metrics: {
      kind: "threejs-byte-stream",
      files_completed: input.metrics.files_completed,
      files_target: input.metrics.files_target,
      bytes_streamed: input.metrics.bytes_streamed,
      buffer_capacity_chunks: input.metrics.buffer_capacity_chunks,
      buffer_peak_chunks: input.metrics.buffer_peak_chunks,
      buffer_overflows: input.metrics.buffer_overflows,
      whole_file_trap_used: input.metrics.whole_file_trap_used,
      invalid_chunks_leaked: input.metrics.invalid_chunks_leaked,
      size_cap_violations: input.metrics.size_cap_violations,
      hasher_match: input.metrics.hasher_match,
      cancellations: input.metrics.cancellations,
      throughput_mbps: input.metrics.throughput_mbps,
    },
    curriculum_context: { ...CURRICULUM_CONTEXT },
    review_context: { ...REVIEW_CONTEXT },
  }
  return validateEvidenceRecord(record)
}

// Single typed emission point for the whole game. Validates the record,
// appends it to the append-only window channel, sets the single-record slot,
// and prints the legacy `EVIDENCE <json>` console line for stdout scrapers.
export function emitEvidence(record: ByteStreamEvidenceRecord): ByteStreamEvidenceRecord {
  return dualEmit(record, "game")
}
