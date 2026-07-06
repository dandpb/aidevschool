import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const UNIT_ID = "U6-file-upload"
const PROJECT = "06_file_upload_pipeline"
const GAME = "PIPELINE PLANT"

export interface EvidenceRecord {
  source: "voxeldojo"
  unit_id: "U6-file-upload"
  project: "06_file_upload_pipeline"
  scenario_id: `pipeline-plant-${LevelId}`
  game: "PIPELINE PLANT"
  ts: string
  pass: boolean
  metrics: Record<string, number | boolean | string>
  review_context: {
    unit_kind: "concept"
    scheduled_review: boolean
    review_reason: "due" | "deepening"
    scheduler_source: "learner-substrate"
    verifier_required: true
  }
  curriculum_context: {
    concept: "streaming vs buffering + bounded memory"
    mechanic: "fluid tank + pipe + chunked slugs"
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
  metrics: Record<string, number | boolean | string>,
): EvidenceRecord {
  // Scheduling truth comes from the substrate-generated review slice: if the unit is
  // in nextReviews this attempt is a scheduled review; otherwise it is deepening play.
  const scheduled = reviewSlice.nextReviews.some((r) => r.unitId === UNIT_ID)
  const record: EvidenceRecord = {
    source: "voxeldojo",
    unit_id: UNIT_ID,
    project: PROJECT,
    scenario_id: `pipeline-plant-${level}`,
    game: GAME,
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
      concept: "streaming vs buffering + bounded memory",
      mechanic: "fluid tank + pipe + chunked slugs",
    },
  }
  if (typeof window !== "undefined") {
    window.__voxelDojoEvidence = window.__voxelDojoEvidence ?? []
    window.__voxelDojoEvidence.push(record)
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
