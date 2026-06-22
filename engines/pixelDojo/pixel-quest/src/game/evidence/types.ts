export type PixelQuestEvidenceMetrics = {
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

export type PixelQuestReviewContext = {
  readonly unit_kind: "concept"
  readonly scheduled_review: boolean
  readonly review_reason: "due" | "overdue" | "interleaving" | "recurring-trap"
  readonly streak_candidate: boolean
  readonly scheduler_source: "learner-substrate"
  readonly verifier_required: true
}

export type PixelQuestCurriculumContext = {
  readonly concept: string
  readonly mechanic: string
  readonly accepted_signal: string
  readonly rejected_trap: string
}

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
