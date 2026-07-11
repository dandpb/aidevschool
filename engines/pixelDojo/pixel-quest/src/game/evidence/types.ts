import type { CurriculumContext, EvidenceReviewContext } from "@aidevschool/evidence"

// Each encounter kind emits its own metrics variant, discriminated by `kind`.
// The validator (game/evidence/evidence.ts) dispatches on `metrics.kind` so
// that adding a new encounter kind only requires extending this union and
// adding one reader — no central switch over a single fixed schema.

export type TokenBucketMetrics = {
  readonly kind: "pixelquest-token-bucket"
  readonly target_rate: number
  readonly observed_admit_rate: number
  readonly max_burst_1s: number
  readonly good_admits: number
  readonly legit_rejected: number
  readonly abusive_admitted: number
  readonly abusive_rejected: number
  readonly heat_peak: number
  readonly overheated: boolean
}

export type RouteHealthMetrics = {
  readonly kind: "pixelquest-route-health"
  readonly routed: number
  readonly isolated: number
  readonly bad_routes: number
  readonly good_rejected: number
  readonly heat_peak: number
  readonly overheated: boolean
}

export type PolicyGateMetrics = {
  readonly kind: "pixelquest-policy-gate"
  readonly allowed: number
  readonly denied: number
  readonly policy_leaks: number
  readonly false_denies: number
  readonly heat_peak: number
  readonly overheated: boolean
}

export type SequenceMetrics = {
  readonly kind: "pixelquest-sequence-flow"
  readonly advanced: number
  readonly held: number
  readonly skipped_required: number
  readonly guards_missed: number
  readonly heat_peak: number
  readonly overheated: boolean
}

export type TaskQueueMetrics = {
  readonly kind: "pixelquest-task-queue"
  readonly processed: number
  readonly poison_dead_lettered: number
  readonly poison_retried: number
  readonly legit_retried: number
  readonly backpressure_peak: number
  readonly overheated: boolean
}

export type PixelQuestEvidenceMetrics =
  | TokenBucketMetrics
  | RouteHealthMetrics
  | PolicyGateMetrics
  | SequenceMetrics
  | TaskQueueMetrics

export type PixelQuestReviewContext = EvidenceReviewContext<
  "due" | "overdue" | "interleaving" | "recurring-trap"
>

export type PixelQuestCurriculumContext = CurriculumContext

export type PixelQuestEvidenceRecord = {
  readonly source: "pixelquest"
  readonly unit_id: string
  readonly project: string
  readonly encounter_id: string
  readonly game: "PixelDojo Quest"
  readonly ts: string
  readonly pass: boolean
  readonly metrics: PixelQuestEvidenceMetrics
  readonly review_context?: PixelQuestReviewContext
  readonly curriculum_context?: PixelQuestCurriculumContext
}
