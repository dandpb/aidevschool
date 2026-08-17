import { reviewSlice } from "../reviewSlice"
import { createEmitForGame, type EvidenceRecord } from "../../../shared/createEmitForGame"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const emitEvidence = createEmitForGame<LevelId>("game-02-warehouse", reviewSlice)
