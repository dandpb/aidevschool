import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U6-file-upload",
  project: "06_file_upload_pipeline",
  game: "PIPELINE PLANT",
  curriculum: {
    concept: "streaming vs buffering + bounded memory",
    mechanic: "fluid tank + pipe + chunked slugs",
  },
}

export type { EvidenceRecord }

/**
 * Emit one raw evidence record. Envelope / dual-channel live in the shared
 * teaching-evidence module; this file only supplies unit identity + metrics.
 */
export function emitEvidence(
  level: LevelId,
  pass: boolean,
  metrics: Record<string, number | boolean | string>,
): EvidenceRecord {
  return emitShared({
    meta: {
      ...META,
      scenarioId: `pipeline-plant-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
