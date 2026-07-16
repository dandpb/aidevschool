import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U14-log-aggregator",
  project: "14_log_aggregator",
  game: "RIVER DELTA",
  scenarioSlug: "river-delta",
  curriculum: {
    concept: "log pipelines + correlation IDs",
    mechanic: "converging log tributaries, dye trace",
  },
  reviewSlice,
})
