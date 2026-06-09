import { describe, expect, it } from "vitest"
import { cycleStages } from "./data/cycle"
import { findAgent, findStage, getCompletionPercent } from "./progress"
import { initialState, reduceState } from "./state"

describe("codexDojo progress model", () => {
  it("computes completion percent when known stages are completed", () => {
    // Given
    const firstTwoStages = cycleStages.slice(0, 2).map((stage) => stage.id)

    // When
    const percent = getCompletionPercent(firstTwoStages)

    // Then
    expect(percent).toBe(20)
  })

  it("advances the selected stage and records the prior stage as completed", () => {
    // Given
    const state = { ...initialState, selectedStageId: "projetar", completedStageIds: [] }

    // When
    const nextState = reduceState(state, { kind: "advanceStage" })

    // Then
    expect(nextState.selectedStageId).toBe("implementar")
    expect(nextState.completedStageIds).toContain("projetar")
  })

  it("loads configured agents and stages by id", () => {
    // Given
    const agentId = "arquiteto"
    const stageId = "revisar"

    // When
    const agent = findAgent(agentId)
    const stage = findStage(stageId)

    // Then
    expect(agent.name).toBe("Arquiteto")
    expect(stage.owner).toBe("Revisor")
  })
})
