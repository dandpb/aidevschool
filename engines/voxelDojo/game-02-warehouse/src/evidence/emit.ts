import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U2-key-value-store",
  project: "02_key_value_store",
  game: "KV WAREHOUSE",
  scenarioSlug: "kv-warehouse",
  curriculum: {
    concept: "hash-map-backed CRUD with TTL expiration",
    mechanic: "warehouse shelves + decaying crates",
  },
  reviewSlice,
})
