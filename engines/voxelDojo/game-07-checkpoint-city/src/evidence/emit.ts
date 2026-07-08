import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U7-rest-api-auth",
  project: "07_rest_api_auth",
  game: "CHECKPOINT CITY",
  curriculum: {
    concept: "middleware layers + JWT verification",
    mechanic: "concentric city walls, badge gates",
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
      scenarioId: `checkpoint-city-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
