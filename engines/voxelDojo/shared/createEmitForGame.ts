/** One-liner factory: game id + local reviewSlice → typed emitEvidence. */
import type { ReviewSliceLike } from "@aidevschool/evidence"
import { emitEvidenceFor, type EvidenceRecord } from "./emitEvidenceFor"
import { GAME_EVIDENCE_META, type VoxelGameId } from "./gameEvidenceMeta"

export type { EvidenceRecord }

export function createEmitForGame<TLevel extends string = string>(
  gameId: VoxelGameId,
  reviewSlice: ReviewSliceLike,
) {
  const meta = GAME_EVIDENCE_META[gameId]
  return emitEvidenceFor<TLevel>({
    unitId: meta.unitId,
    project: meta.project,
    game: meta.game,
    scenarioSlug: meta.scenarioSlug,
    curriculum: meta.curriculum,
    reviewSlice,
  })
}
