import { getCycleCompletionPercent } from "../cycle"
import { cycleStages } from "../data/cycle"
import type { CycleStage } from "../domain"
import { findStage } from "../progress"
import type { AppState } from "../state"

export type CycleViewModelStage = {
  readonly stage: CycleStage
  readonly index: number
  readonly isSelected: boolean
  readonly isCompleted: boolean
}

export type CycleViewModel = {
  readonly selectedStage: CycleStage
  readonly progress: number
  readonly stages: readonly CycleViewModelStage[]
}

export function buildCycleViewModel(state: AppState): CycleViewModel {
  const selectedStage = findStage(state.selectedStageId)
  const progress = getCycleCompletionPercent(state.completedStageIds)

  const stages = cycleStages.map((stage, index) => ({
    stage,
    index,
    isSelected: stage.id === selectedStage.id,
    isCompleted: state.completedStageIds.includes(stage.id),
  }))

  return {
    selectedStage,
    progress,
    stages,
  }
}
