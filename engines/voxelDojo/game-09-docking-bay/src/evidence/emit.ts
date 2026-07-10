import { type EvidenceRecord, emitEvidence as emitShared } from "../../../shared/evidence"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

const META = {
  source: "voxeldojo" as const,
  unitId: "U9-plugin-system",
  project: "09_plugin_system",
  game: "DOCKING BAY",
  curriculum: {
    concept: "sandboxing + interface contracts",
    mechanic: "docking pods, force-field sandbox",
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
      scenarioId: `docking-bay-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
