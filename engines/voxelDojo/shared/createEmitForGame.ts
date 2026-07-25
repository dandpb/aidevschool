/** One-liner factory: game id + local reviewSlice → typed emitEvidence. */
import type { ReviewSliceLike } from "@aidevschool/evidence"
import { type EvidenceRecord, emitEvidence as emitShared } from "./evidence"
import { GAME_EVIDENCE_META, type VoxelGameId } from "./gameEvidenceMeta"

export type { EvidenceRecord }

export function createEmitForGame<TLevel extends string = string>(
  gameId: VoxelGameId,
  reviewSlice: ReviewSliceLike,
) {
  const meta = GAME_EVIDENCE_META[gameId]
  return (
    level: TLevel,
    pass: boolean,
    metrics: Record<string, number | boolean | string>,
  ) =>
    emitShared({
      meta: {
        source: "voxeldojo",
        unitId: meta.unitId,
        project: meta.project,
        game: meta.game,
        curriculum: meta.curriculum,
        scenarioId: `${meta.scenarioSlug}-${level}`,
      },
      pass,
      metrics,
      reviewSlice,
    })
}
