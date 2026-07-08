import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U11-load-balancer",
  project: "11_load_balancer",
  game: "AIR TRAFFIC",
  curriculum: {
    concept: "load-balancer routing + health checks",
    mechanic: "air traffic to landing pads",
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
      scenarioId: `air-traffic-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
