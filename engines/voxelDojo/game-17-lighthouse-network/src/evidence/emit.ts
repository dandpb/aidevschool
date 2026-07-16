import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U17-config-service",
  project: "17_distributed_config_service",
  game: "LIGHTHOUSE NETWORK",
  scenarioSlug: "lighthouse-network",
  curriculum: {
    concept: "consensus quorum + watch/notify",
    mechanic: "lighthouse quorum re-aiming beams",
  },
  reviewSlice,
})
