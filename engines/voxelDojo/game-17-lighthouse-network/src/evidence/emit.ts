import { createEmitForGame, type EvidenceRecord } from "../../../shared/createEmitForGame"
import { reviewSlice } from "../content/reviewSlice"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const { emitEvidence } = createEmitForGame<LevelId>(
  "game-17-lighthouse-network",
  reviewSlice,
)
