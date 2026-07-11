import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U12-job-scheduler",
  project: "12_distributed_job_scheduler",
  game: "MISSION CONTROL",
  scenarioSlug: "mission-control",
  curriculum: {
    concept: "leader election + DAG scheduling",
    mechanic: "station constellation + job DAG",
  },
  reviewSlice,
})
