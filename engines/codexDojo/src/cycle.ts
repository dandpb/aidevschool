/**
 * Pure cycle algebra for codexDojo.
 *
 * This module is intentionally defensive: it must stay safe even when the
 * `cycleStages` catalog is empty and when the incoming snapshot references
 * an unknown `selectedStageId`.
 *
 * The invariant that the live app always sees a non-empty `cycleStages`
 * array is owned by `app.ts` at mount time (`mountCodexDojo` throws an
 * `AppMountError` when there are no stages). Validation no longer runs at
 * module load in `state.ts`, so this module cannot assume a populated
 * catalog or a known `selectedStageId` from upstream callers.
 *
 * Therefore `advanceCycle` and `getCycleCompletionPercent` return sensible
 * fallbacks (0% completion, or the original snapshot) instead of throwing.
 * Do not remove these guards without also restoring the data-load
 * validation in `app.ts` mount (see Task 1 of the cleanup plan).
 */
import { cycleStages } from "./data/cycle"

type CycleSnapshot = {
  readonly selectedStageId: string
  readonly completedStageIds: readonly string[]
}

export function advanceCycle(snapshot: CycleSnapshot): CycleSnapshot {
  const selectedIndex = cycleStages.findIndex((stage) => stage.id === snapshot.selectedStageId)
  const nextIndex = selectedIndex >= 0 ? selectedIndex + 1 : 0
  const nextStage = cycleStages[nextIndex] ?? cycleStages[0]

  if (nextStage === undefined) {
    return snapshot
  }

  const completed = snapshot.completedStageIds.includes(snapshot.selectedStageId)
    ? snapshot.completedStageIds
    : [...snapshot.completedStageIds, snapshot.selectedStageId]

  return {
    selectedStageId: nextStage.id,
    completedStageIds: completed,
  }
}

export function getCycleCompletionPercent(completedStageIds: readonly string[]): number {
  if (cycleStages.length === 0) {
    return 0
  }

  const completed = cycleStages.filter((stage) => completedStageIds.includes(stage.id))
  return Math.round((completed.length / cycleStages.length) * 100)
}
