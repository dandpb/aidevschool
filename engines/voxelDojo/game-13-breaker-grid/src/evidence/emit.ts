import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U13-circuit-breaker",
  project: "13_api_gateway_circuit_breaker",
  game: "BREAKER GRID",
  scenarioSlug: "breaker-grid",
  curriculum: {
    concept: "circuit breaker + bulkhead",
    mechanic: "3D power grid of tripping breakers",
  },
  reviewSlice,
})
