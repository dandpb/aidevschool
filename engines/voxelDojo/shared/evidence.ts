/**
 * Deep evidence-emitter module for teaching games (pixelDojo / voxelDojo).
 *
 * Games supply unit identity + metrics + pass; this module owns the envelope,
 * dual channel (window global + EVIDENCE console line), and review_context
 * derived from a substrate review slice.
 *
 * Contract: docs/design/teaching-game-contract.md
 */

export type EvidenceSource = "pixelquest" | "voxeldojo"

export type ReviewReason = "due" | "deepening"

export interface ReviewSliceLike {
  nextReviews: ReadonlyArray<{ unitId: string }>
}

export interface CurriculumContext {
  concept: string
  mechanic: string
}

export interface EvidenceMeta {
  source: EvidenceSource
  unitId: string
  project: string
  /** Scenario / encounter id (stable level key). */
  scenarioId: string
  game: string
  curriculum: CurriculumContext
  /** Window property that holds the append-only evidence array. */
  windowKey?: "__pixelQuestEvidence" | "__voxelDojoEvidence" | "__gameEvidence"
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
  reviewSlice?: ReviewSliceLike
  now?: () => Date
}

declare global {
  interface Window {
    __pixelQuestEvidence?: EvidenceRecord[]
    __voxelDojoEvidence?: EvidenceRecord[]
    __gameEvidence?: EvidenceRecord[] | EvidenceRecord
  }
}

function defaultWindowKey(source: EvidenceSource): NonNullable<EvidenceMeta["windowKey"]> {
  if (source === "pixelquest") return "__pixelQuestEvidence"
  return "__voxelDojoEvidence"
}

/**
 * Build + dual-emit one raw evidence record. Never writes learner state.
 */
export function emitEvidence(opts: EmitOptions): EvidenceRecord {
  const { meta, pass, metrics } = opts
  const now = opts.now ?? (() => new Date())
  const unitId = meta.unitId
  const scheduled =
    opts.reviewSlice?.nextReviews.some((r) => r.unitId === unitId) ?? false

  const record: EvidenceRecord = {
    source: meta.source,
    unit_id: unitId,
    project: meta.project,
    scenario_id: meta.scenarioId,
    game: meta.game,
    ts: now().toISOString(),
    pass,
    metrics,
    review_context: {
      unit_kind: "concept",
      scheduled_review: scheduled,
      review_reason: scheduled ? "due" : "deepening",
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
    curriculum_context: meta.curriculum,
  }

  const key = meta.windowKey ?? defaultWindowKey(meta.source)
  if (typeof window !== "undefined") {
    const w = window as Window & Record<string, EvidenceRecord[] | undefined>
    const prev = w[key]
    const list = Array.isArray(prev) ? prev : []
    w[key] = [...list, record]
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
