import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U16-message-queue",
  project: "16_mini_message_queue",
  game: "FREIGHT YARD",
  curriculum: {
    concept: "partitioned log + consumer-group offsets",
    mechanic: "freight yard of track lanes",
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
      scenarioId: `freight-yard-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
