// Evidence record for the Byte Stream Reactor sibling app.
//
// Discriminated by `metrics.kind = "threejs-byte-stream"` (sibling-app local
// type — NOT added to pixel-quest/src/game/evidence/types.ts). The full
// contract lives in engines/pixelDojo/docs/plans/06_file_upload_pipeline.md
// (Learning-gate hooks section).

export type ByteStreamMetrics = {
  readonly kind: "threejs-byte-stream"
  readonly files_completed: number
  readonly files_target: number
  readonly bytes_streamed: number
  readonly buffer_capacity_chunks: number
  readonly buffer_peak_chunks: number
  readonly buffer_overflows: number
  readonly whole_file_trap_used: boolean
  readonly invalid_chunks_leaked: number
  readonly size_cap_violations: number
  readonly hasher_match: boolean
  readonly cancellations: number
  readonly throughput_mbps: number
}

export type ReviewContext = {
  readonly unit_kind: "concept"
  readonly scheduled_review: boolean
  readonly review_reason: "due" | "overdue" | "interleaving" | "recurring-trap"
  readonly streak_candidate: boolean
  readonly scheduler_source: "learner-substrate"
  readonly verifier_required: true
}

export type CurriculumContext = {
  readonly concept: string
  readonly mechanic: string
  readonly accepted_signal: string
  readonly rejected_trap: string
}

export type ByteStreamEvidenceRecord = {
  readonly source: "threejs-dojo"
  readonly unit_id: "06_file_upload_pipeline"
  readonly project: "06_file_upload_pipeline"
  readonly encounter_id: string
  readonly game: "Byte Stream Reactor"
  readonly ts: string
  readonly pass: boolean
  readonly metrics: ByteStreamMetrics
  readonly curriculum_context: CurriculumContext
  readonly review_context: ReviewContext
}
