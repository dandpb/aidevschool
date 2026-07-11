import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U16-message-queue",
  project: "16_mini_message_queue",
  game: "FREIGHT YARD",
  scenarioSlug: "freight-yard",
  curriculum: {
    concept: "partitioned log + consumer-group offsets",
    mechanic: "freight yard of track lanes",
  },
  reviewSlice,
})
