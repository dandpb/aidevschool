import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const UNIT_ID = "U13-circuit-breaker"

export interface EvidenceRecord {
  source: "voxeldojo"
  unit_id: "U13-circuit-breaker"
  project: "13_api_gateway_circuit_breaker"
  scenario_id: `breaker-grid-${LevelId}`
  game: "BREAKER GRID"
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
    concept: "circuit breaker + bulkhead"
    mechanic: "3D power grid of tripping breakers"
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
    project: "13_api_gateway_circuit_breaker",
    scenario_id: `breaker-grid-${level}`,
    game: "BREAKER GRID",
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
      concept: "circuit breaker + bulkhead",
      mechanic: "3D power grid of tripping breakers",
    },
  }
  if (typeof window !== "undefined") {
    window.__voxelDojoEvidence = window.__voxelDojoEvidence ?? []
    window.__voxelDojoEvidence.push(record)
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
