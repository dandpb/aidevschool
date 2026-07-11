import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U18-search-engine",
  project: "18_search_engine",
  game: "STACKS",
  scenarioSlug: "stacks",
  curriculum: {
    concept: "inverted index + ranking",
    mechanic: "3D library, word-card catalog",
  },
  reviewSlice,
})
