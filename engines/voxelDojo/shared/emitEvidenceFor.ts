/**
 * Low-level evidence factory. Games should use `createEmitForGame(gameId, reviewSlice)`
 * so identity lives in `gameEvidenceMeta.ts` (one catalog, not 16 copies).
 */
import { type EvidenceRecord, emitEvidence as emitShared } from "./evidence"
import type { ReviewSliceLike } from "@aidevschool/evidence"

export interface EvidenceFactoryOptions {
  unitId: string
  project: string
  game: string
  scenarioSlug: string
  curriculum: { concept: string; mechanic: string }
  reviewSlice: ReviewSliceLike
}

export function emitEvidenceFor<TLevel extends string = string>(
  opts: EvidenceFactoryOptions,
): {
  emitEvidence: (
    level: TLevel,
    pass: boolean,
    metrics: Record<string, number | boolean | string>,
  ) => EvidenceRecord
} {
  const meta = {
    source: "voxeldojo" as const,
    unitId: opts.unitId,
    project: opts.project,
    game: opts.game,
    curriculum: opts.curriculum,
  }
  return {
    /**
     * Emit one raw evidence record. Envelope / dual-channel live in the shared
     * teaching-evidence module; this only supplies unit identity + metrics.
     */
    emitEvidence: (level, pass, metrics) =>
      emitShared({
        meta: { ...meta, scenarioId: `${opts.scenarioSlug}-${level}` },
        pass,
        metrics,
        reviewSlice: opts.reviewSlice,
      }),
  }
}

export type { EvidenceRecord }
