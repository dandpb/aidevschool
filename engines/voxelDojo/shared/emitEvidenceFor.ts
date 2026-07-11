/**
 * Config-driven evidence factory for voxelDojo games.
 *
 * Each game's `src/evidence/emit.ts` was a byte-identical 36-line wrapper that
 * differed only in the META literal and the scenarioId prefix. This factory
 * collapses the boilerplate: a game supplies identity + level type + reviewSlice
 * and gets back the typed `emitEvidence(level, pass, metrics)` function.
 *
 * Usage in `src/evidence/emit.ts`:
 *   export const { emitEvidence } = emitEvidenceFor({
 *     unitId: "U9-distributed-cache",
 *     project: "10_distributed_cache",
 *     game: "HASH RING",
 *     scenarioSlug: "hash-ring",
 *     curriculum: { concept: "consistent hashing", mechanic: "orbital hash ring" },
 *     reviewSlice,
 *   })
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
