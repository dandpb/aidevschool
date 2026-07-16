import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U7-rest-api-auth",
  project: "07_rest_api_auth",
  game: "CHECKPOINT CITY",
  scenarioSlug: "checkpoint-city",
  curriculum: {
    concept: "middleware layers + JWT verification",
    mechanic: "concentric city walls, badge gates",
  },
  reviewSlice,
})
