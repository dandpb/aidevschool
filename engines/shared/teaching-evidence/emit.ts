/**
 * Deep evidence-emitter for teaching games.
 * Games supply identity + metrics + pass; this owns envelope + dual channel.
 * Contract: docs/design/teaching-game-contract.md
 */

export type EvidenceSource = "pixelquest" | "voxeldojo"
export type ReviewReason = "due" | "deepening"
export type WindowKey = "__pixelQuestEvidence" | "__voxelDojoEvidence" | "__gameEvidence"

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

// ponytail: no `declare global { interface Window }` augmentation here —
// each consumer (pixel-quest, voxelDojo) declares its own channel array
// type, and dualEmit writes through `as unknown as Record<string, unknown>`
// so it does not need window-typed property names.

/**
 * Dual-channel emit for any record shape.
 * Console line scraped by Playwright; window channel is in-page.
 * Never writes learner state.
 */
export function dualEmit<T extends object>(
  record: T,
  channel: "game" | "pixelquest" | "voxeldojo" = "game",
): T {
  if (typeof window !== "undefined") {
    const w = window as unknown as Record<string, unknown>
    if (channel === "game") {
      w["__gameEvidence"] = record
    } else if (channel === "pixelquest") {
      const prev = w["__pixelQuestEvidence"]
      w["__pixelQuestEvidence"] = [...(Array.isArray(prev) ? prev : []), record]
    } else {
      const prev = w["__voxelDojoEvidence"]
      w["__voxelDojoEvidence"] = [...(Array.isArray(prev) ? prev : []), record]
    }
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}

/** Dual-emit one typed teaching-game evidence record. Never writes learner state. */
export function emitEvidence(opts: EmitOptions): EvidenceRecord {
  const { meta, pass, metrics } = opts
  const now = opts.now ?? (() => new Date())
  const scheduled = opts.reviewSlice?.nextReviews.some((r) => r.unitId === meta.unitId) ?? false

  const record: EvidenceRecord = {
    source: meta.source,
    unit_id: meta.unitId,
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

  const channel = meta.source === "pixelquest" ? "pixelquest" : "voxeldojo"
  return dualEmit(record, meta.windowKey === "__gameEvidence" ? "game" : channel)
}
