import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U8-event-driven",
  project: "08_event_driven_order_system",
  game: "TIMELINE TOWER",
  scenarioSlug: "timeline-tower",
  curriculum: {
    concept: "append-only log + projection replay",
    mechanic: "tower of stacked event floors",
  },
  reviewSlice,
})
