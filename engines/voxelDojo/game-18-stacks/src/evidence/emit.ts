import { type EvidenceRecord, emitEvidence as emitShared } from "../../../shared/evidence"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const META = {
  source: "voxeldojo" as const,
  unitId: "U18-search-engine",
  project: "18_search_engine",
  game: "STACKS",
  curriculum: {
    concept: "inverted index + ranking",
    mechanic: "3D library, word-card catalog",
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
      scenarioId: `stacks-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
