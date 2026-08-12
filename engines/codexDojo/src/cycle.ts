/**
 * Pure cycle algebra for codexDojo.
 *
 * The live app always sees a non-empty `cycleStages` catalog because `app.ts`
 * validates it at mount time (`mountCodexDojo` throws `AppMountError` when
 * there are no stages). Module-level guards are therefore unnecessary here.
 */
import { cycleStages } from "./data/cycle"

type CycleSnapshot = {
  readonly selectedStageId: string
  readonly completedStageIds: readonly string[]
}

// ⚡ Bolt: Pre-compute static stage indices at module initialization for O(1) lookup,
// avoiding O(N) array scans inside advanceCycle loop/state derivations.
const stageIndicesById = new Map<string, number>()
for (let i = 0; i < cycleStages.length; i++) {
  const stage = cycleStages[i]
  if (stage) {
    stageIndicesById.set(stage.id, i)
  }
}

export function advanceCycle(snapshot: CycleSnapshot): CycleSnapshot {
  const mapIndex = stageIndicesById.get(snapshot.selectedStageId)
  const selectedIndex = mapIndex ?? -1
  const nextIndex = selectedIndex >= 0 ? selectedIndex + 1 : 0
  const nextStage = cycleStages[nextIndex] ?? cycleStages[0]

  if (nextStage === undefined) {
    return snapshot
  }

  const selectedStage = cycleStages[selectedIndex]
  const completed =
    selectedStage === undefined || snapshot.completedStageIds.includes(selectedStage.id)
      ? snapshot.completedStageIds
      : [...snapshot.completedStageIds, selectedStage.id]

  return {
    selectedStageId: nextStage.id,
    completedStageIds: completed,
  }
}

export function getCycleCompletionPercent(completedStageIds: readonly string[]): number {
  // ⚡ Bolt: Use a simple counter instead of allocating a new array via .filter()
  // to reduce unnecessary garbage collection pressure during renders.
  let completedCount = 0
  for (const stage of cycleStages) {
    if (completedStageIds.includes(stage.id)) {
      completedCount++
    }
  }

  return Math.round((completedCount / cycleStages.length) * 100)
}
