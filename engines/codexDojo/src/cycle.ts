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
