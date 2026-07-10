import { type EvidenceRecord, emitEvidence as emitShared } from "../../../shared/evidence"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const META = {
  source: "voxeldojo" as const,
  unitId: "U8-event-driven",
  project: "08_event_driven_order_system",
  game: "TIMELINE TOWER",
  curriculum: {
    concept: "append-only log + projection replay",
    mechanic: "tower of stacked event floors",
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
      scenarioId: `timeline-tower-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
