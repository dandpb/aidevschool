/** One-liner factory: game id + local reviewSlice → typed emitEvidence. */
import type { ReviewSliceLike } from "@aidevschool/evidence"
import catalog from "../catalog.json"
import { type EvidenceRecord, emitEvidence as emitShared } from "./evidence"
import { GAME_EVIDENCE_META, type VoxelGameId } from "./gameEvidenceMeta"

export type { EvidenceRecord }

// game → curriculum unit is single-sourced in catalog.json (the Python
// substrate reads the same file; see learner/substrate/dashboard_snapshot.py).
const UNIT_ID_BY_GAME = Object.fromEntries(
  catalog.map((entry) => [entry.id, entry.unitId]),
) as Record<VoxelGameId, string>

export function createEmitForGame<TLevel extends string = string>(
  gameId: VoxelGameId,
  reviewSlice: ReviewSliceLike,
) {
  const meta = GAME_EVIDENCE_META[gameId]
  return (
    level: TLevel,
    pass: boolean,
    metrics: Record<string, number | boolean | string>,
    observations?: Readonly<Record<string, unknown>>,
  ) =>
    emitShared({
      meta: {
        source: "voxeldojo",
        unitId: UNIT_ID_BY_GAME[gameId],
        project: meta.project,
        game: meta.game,
        curriculum: meta.curriculum,
        scenarioId: `${meta.scenarioSlug}-${level}`,
      },
      pass,
      metrics,
      ...(observations === undefined ? {} : { observations }),
      reviewSlice,
    })
}
