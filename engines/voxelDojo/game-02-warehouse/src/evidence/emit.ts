import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U2-key-value-store",
  project: "02_key_value_store",
  game: "WAREHOUSE",
  curriculum: {
    concept: "hash-addressed storage + TTL expiry",
    mechanic: "warehouse shelves + decaying crates",
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
      scenarioId: `warehouse-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
