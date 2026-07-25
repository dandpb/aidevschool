import { describe, expect, it } from "vitest"
import { cycleStages } from "../data/cycle"
import { buildInitialState } from "../state"
import { buildCycleViewModel } from "./cycleViewModel"

describe("buildCycleViewModel", () => {
  it("marks the selected stage and completed stages", () => {
    const state = buildInitialState("maestro", "revisar", "p01")
    const model = buildCycleViewModel(state)

    const revisar = model.stages.find((s) => s.stage.id === "revisar")
    expect(revisar?.isSelected).toBe(true)

    const diagnosticar = model.stages.find((s) => s.stage.id === "diagnosticar")
    expect(diagnosticar?.isCompleted).toBe(true)
  })

  it("computes progress from completed stages", () => {
    const state = buildInitialState("maestro", "diagnosticar", "p01")
    const model = buildCycleViewModel(state)

    const completedCount = state.completedStageIds.length
    const expected = Math.round((completedCount / cycleStages.length) * 100)
    expect(model.progress).toBe(expected)
  })

  it("includes every cycle stage in order", () => {
    const state = buildInitialState("maestro", "diagnosticar", "p01")
    const model = buildCycleViewModel(state)

    expect(model.stages).toHaveLength(cycleStages.length)
    expect(model.stages.map((s) => s.stage.id)).toEqual(cycleStages.map((s) => s.id))
  })
})
