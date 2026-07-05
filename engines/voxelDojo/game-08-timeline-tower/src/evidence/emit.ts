import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const UNIT_ID = "U8-event-driven"

export interface EvidenceRecord {
  source: "voxeldojo"
  unit_id: "U8-event-driven"
  project: "08_event_driven_order_system"
  scenario_id: `timeline-tower-${LevelId}`
  game: "TIMELINE TOWER"
  ts: string
  pass: boolean
  metrics: Record<string, number | boolean>
  review_context: {
    unit_kind: "concept"
    scheduled_review: boolean
    review_reason: "due" | "deepening"
    scheduler_source: "learner-substrate"
    verifier_required: true
  }
  curriculum_context: {
    concept: "append-only log + projection replay"
    mechanic: "tower of stacked event floors"
  }
}

declare global {
  interface Window {
    __voxelDojoEvidence?: EvidenceRecord[]
  }
}

/**
 * Emit one raw evidence record. The game's responsibility ends here:
 * a separate verifier (Prometor context) reads these records and owns any
 * learner-state transition. This module must never import learner state.
 */
export function emitEvidence(
  level: LevelId,
  pass: boolean,
  metrics: Record<string, number | boolean>,
): EvidenceRecord {
  // Scheduling truth comes from the substrate-generated review slice: if the unit is
  // in nextReviews this attempt is a scheduled review; otherwise it is deepening play.
  const scheduled = reviewSlice.nextReviews.some((r) => r.unitId === UNIT_ID)
  const record: EvidenceRecord = {
    source: "voxeldojo",
    unit_id: UNIT_ID,
    project: "08_event_driven_order_system",
    scenario_id: `timeline-tower-${level}`,
    game: "TIMELINE TOWER",
    ts: new Date().toISOString(),
    pass,
    metrics,
    review_context: {
      unit_kind: "concept",
      scheduled_review: scheduled,
      review_reason: scheduled ? "due" : "deepening",
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
    curriculum_context: {
      concept: "append-only log + projection replay",
      mechanic: "tower of stacked event floors",
    },
  }
  if (typeof window !== "undefined") {
    window.__voxelDojoEvidence = window.__voxelDojoEvidence ?? []
    window.__voxelDojoEvidence.push(record)
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
