import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const UNIT_ID = "U17-config-service"

export interface EvidenceRecord {
  source: "voxeldojo"
  unit_id: "U17-config-service"
  project: "17_distributed_config_service"
  scenario_id: `lighthouse-network-${LevelId}`
  game: "LIGHTHOUSE NETWORK"
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
    concept: "consensus quorum + watch/notify"
    mechanic: "lighthouse quorum re-aiming beams"
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
    project: "17_distributed_config_service",
    scenario_id: `lighthouse-network-${level}`,
    game: "LIGHTHOUSE NETWORK",
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
      concept: "consensus quorum + watch/notify",
      mechanic: "lighthouse quorum re-aiming beams",
    },
  }
  if (typeof window !== "undefined") {
    window.__voxelDojoEvidence = window.__voxelDojoEvidence ?? []
    window.__voxelDojoEvidence.push(record)
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
