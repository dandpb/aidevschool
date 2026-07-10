import { type EvidenceRecord, emitEvidence as emitShared } from "../../../shared/evidence"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const META = {
  source: "voxeldojo" as const,
  unitId: "U15-metrics-collector",
  project: "15_metrics_collector",
  game: "OBSERVATORY",
  curriculum: {
    concept: "histograms + percentiles + alerting",
    mechanic: "histogram terrain + alert plane",
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
      scenarioId: `observatory-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
