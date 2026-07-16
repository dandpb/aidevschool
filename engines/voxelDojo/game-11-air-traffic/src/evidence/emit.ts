import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U11-load-balancer",
  project: "11_load_balancer",
  game: "AIR TRAFFIC",
  scenarioSlug: "air-traffic",
  curriculum: {
    concept: "load-balancer routing + health checks",
    mechanic: "air traffic to landing pads",
  },
  reviewSlice,
})
