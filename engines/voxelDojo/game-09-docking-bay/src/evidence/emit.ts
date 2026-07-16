import { type EvidenceRecord, emitEvidenceFor } from "../../../shared/emitEvidenceFor"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = emitEvidenceFor<LevelId>({
  unitId: "U9-plugin-system",
  project: "09_plugin_system",
  game: "DOCKING BAY",
  scenarioSlug: "docking-bay",
  curriculum: {
    concept: "sandboxing + interface contracts",
    mechanic: "docking pods, force-field sandbox",
  },
  reviewSlice,
})
