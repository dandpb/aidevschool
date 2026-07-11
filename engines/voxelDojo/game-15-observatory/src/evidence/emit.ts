import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U15-metrics-collector",
  project: "15_metrics_collector",
  game: "OBSERVATORY",
  scenarioSlug: "observatory",
  curriculum: {
    concept: "histograms + percentiles + alerting",
    mechanic: "histogram terrain + alert plane",
  },
  reviewSlice,
})
