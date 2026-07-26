/**
 * Deep evidence-emitter for teaching games.
 * Games supply identity + metrics + pass; this owns envelope + dual channel.
 * Contract: docs/design/teaching-game-contract.md
 */

import type { CurriculumContext, EvidenceSource, ReviewReason } from "./evidenceEnvelope"
import { dualEmit } from "./evidenceTransport"

export type {
  CurriculumContext,
  EvidenceEnvelopeValidationOptions,
  EvidenceReviewContext,
  EvidenceSource,
  ReviewReason,
  ValidatedEvidenceEnvelope,
} from "./evidenceEnvelope"
export {
  EvidenceValidationError,
  readBoolean,
  readNumber,
  validateEvidenceEnvelope,
} from "./evidenceEnvelope"
export type { EvidenceChannel } from "./evidenceTransport"
export {
  configureEvidenceParentOrigin,
  dualEmit,
  TEACHING_EVIDENCE_MESSAGE,
} from "./evidenceTransport"

export type WindowKey = "__pixelQuestEvidence" | "__voxelDojoEvidence" | "__gameEvidence"

export interface ReviewSliceLike {
  nextReviews: ReadonlyArray<{ unitId: string }>
}

export interface EvidenceMeta {
  source: EvidenceSource
  unitId: string
  project: string
  scenarioId: string
  game: string
  curriculum: CurriculumContext
  windowKey?: WindowKey
}

export interface EvidenceRecord {
  source: EvidenceSource
  unit_id: string
  project: string
  scenario_id: string
  game: string
  ts: string
  pass: boolean
  metrics: Record<string, number | boolean | string>
  observations?: Readonly<Record<string, unknown>>
  review_context: {
    unit_kind: "concept"
    scheduled_review: boolean
    review_reason: ReviewReason
    scheduler_source: "learner-substrate"
    verifier_required: true
  }
  curriculum_context: CurriculumContext
}

export interface EmitOptions {
  meta: EvidenceMeta
  pass: boolean
  metrics: Record<string, number | boolean | string>
  observations?: Readonly<Record<string, unknown>>
  reviewSlice?: ReviewSliceLike
  now?: () => Date
}

export function emitEvidence(opts: EmitOptions): EvidenceRecord {
  const { meta, pass, metrics, observations } = opts
  const now = opts.now ?? (() => new Date())
  const scheduled =
    opts.reviewSlice?.nextReviews.some((review) => review.unitId === meta.unitId) ?? false

  const record: EvidenceRecord = {
    source: meta.source,
    unit_id: meta.unitId,
    project: meta.project,
    scenario_id: meta.scenarioId,
    game: meta.game,
    ts: now().toISOString(),
    pass,
    metrics,
    ...(observations === undefined ? {} : { observations }),
    review_context: {
      unit_kind: "concept",
      scheduled_review: scheduled,
      review_reason: scheduled ? "due" : "deepening",
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
    curriculum_context: meta.curriculum,
  }

  const channel = meta.source === "pixelquest" ? "pixelquest" : "voxeldojo"
  return dualEmit(record, meta.windowKey === "__gameEvidence" ? "game" : channel)
}
