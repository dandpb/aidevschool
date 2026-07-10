import { type EvidenceRecord, emitEvidence as emitShared } from "../../../shared/evidence"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const META = {
  source: "voxeldojo" as const,
  unitId: "U14-log-aggregator",
  project: "14_log_aggregator",
  game: "RIVER DELTA",
  curriculum: {
    concept: "log pipelines + correlation IDs",
    mechanic: "converging log tributaries, dye trace",
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
      scenarioId: `river-delta-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
