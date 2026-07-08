import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U3-url-shortener",
  project: "03_url_shortener",
  game: "WORMHOLE",
  curriculum: {
    concept: "short-code generation + collision handling",
    mechanic: "wormhole code-gates between planets",
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
      scenarioId: `wormhole-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
