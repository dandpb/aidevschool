import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"
import { emitEvidence as emitShared, type EvidenceRecord } from "../../../shared/evidence"

const META = {
  source: "voxeldojo" as const,
  unitId: "U12-job-scheduler",
  project: "12_distributed_job_scheduler",
  game: "MISSION CONTROL",
  curriculum: {
    concept: "leader election + DAG scheduling",
    mechanic: "station constellation + job DAG",
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
      scenarioId: `mission-control-${level}`,
    },
    pass,
    metrics,
    reviewSlice,
  })
}
