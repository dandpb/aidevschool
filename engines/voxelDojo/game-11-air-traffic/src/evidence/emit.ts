import { reviewSlice } from "../../../shared/content"
import { createEmitForGame, type EvidenceRecord } from "../../../shared/createEmitForGame"
import type { LevelId } from "../sim/levels"

export type { EvidenceRecord }

export const emitEvidence = createEmitForGame<LevelId>("game-11-air-traffic", reviewSlice)
