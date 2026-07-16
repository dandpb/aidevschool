import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U9-distributed-cache",
  project: "10_distributed_cache",
  game: "HASH RING",
  scenarioSlug: "hash-ring",
  curriculum: {
    concept: "consistent hashing",
    mechanic: "orbital hash ring",
  },
  reviewSlice,
})
