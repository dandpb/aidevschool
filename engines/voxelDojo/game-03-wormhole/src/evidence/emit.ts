import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U3-url-shortener",
  project: "03_url_shortener",
  game: "WORMHOLE",
  scenarioSlug: "wormhole",
  curriculum: {
    concept: "short-code generation + collision handling",
    mechanic: "wormhole code-gates between planets",
  },
  reviewSlice,
})
