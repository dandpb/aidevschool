import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U17-config-service",
  project: "17_distributed_config_service",
  game: "LIGHTHOUSE NETWORK",
  curriculum: {
    concept: "consensus quorum + watch/notify",
    mechanic: "lighthouse quorum re-aiming beams",
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
      scenarioId: `lighthouse-network-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
