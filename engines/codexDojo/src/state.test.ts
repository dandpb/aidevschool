import { describe, expect, it } from "vitest"
import { cycleStages } from "./data/cycle"
import { type AppState, initialState, reduceState } from "./state"

// Characterization tests for the reducer — they capture current behavior so
// later structure-only refactors can be proven safe (snapshots for state).

const stateWith = (overrides: Partial<AppState>): AppState => ({ ...initialState, ...overrides })

describe("reduceState — changeView", () => {
  it("sets the view and clears any ephemeral copied-agent state", () => {
    // Given
    const state = stateWith({ copiedAgentId: "arquiteto" })

    // When
    const next = reduceState(state, { kind: "changeView", view: "agents" })

    // Then
    expect(next.view).toBe("agents")
    expect(next.copiedAgentId).toBeNull()
  })
})

describe("reduceState — selectAgent", () => {
  it("selects the agent, jumps to the agents view, and clears copied state", () => {
    // Given
    const state = stateWith({ view: "overview", copiedAgentId: "arquiteto" })

    // When
    const next = reduceState(state, { kind: "selectAgent", agentId: "revisor" })

    // Then
    expect(next.selectedAgentId).toBe("revisor")
    expect(next.view).toBe("agents")
    expect(next.copiedAgentId).toBeNull()
  })
})

describe("reduceState — selectStage", () => {
  it("selects the stage and jumps to the cycle view", () => {
    // Given
    const state = stateWith({ view: "overview" })

    // When
    const next = reduceState(state, { kind: "selectStage", stageId: "revisar" })

    // Then
    expect(next.selectedStageId).toBe("revisar")
    expect(next.view).toBe("cycle")
  })
})

describe("reduceState — setProjectFilter", () => {
  it("sets the filter and jumps to the roadmap view", () => {
    // Given
    const state = stateWith({ view: "overview" })

    // When
    const next = reduceState(state, { kind: "setProjectFilter", filter: "apps" })

    // Then
    expect(next.projectFilter).toBe("apps")
    expect(next.view).toBe("roadmap")
  })
})

describe("reduceState — markCopied", () => {
  it("records the copied agent id", () => {
    // Given
    const state = stateWith({ copiedAgentId: null })

    // When
    const next = reduceState(state, { kind: "markCopied", agentId: "arquiteto" })

    // Then
    expect(next.copiedAgentId).toBe("arquiteto")
  })

  it("clears the copied agent id when given null", () => {
    // Given
    const state = stateWith({ copiedAgentId: "arquiteto" })

    // When
    const next = reduceState(state, { kind: "markCopied", agentId: null })

    // Then
    expect(next.copiedAgentId).toBeNull()
  })
})

describe("reduceState — advanceStage", () => {
  it("advances to the next stage and records the prior stage as completed", () => {
    // Given
    const state = stateWith({ selectedStageId: "projetar", completedStageIds: [] })

    // When
    const next = reduceState(state, { kind: "advanceStage" })

    // Then
    expect(next.selectedStageId).toBe("implementar")
    expect(next.completedStageIds).toContain("projetar")
    expect(next.view).toBe("cycle")
  })

  it("wraps to the first stage when advancing past the last", () => {
    // Given
    const firstStage = cycleStages[0]
    const lastStage = cycleStages[cycleStages.length - 1]
    if (firstStage === undefined || lastStage === undefined) {
      throw new Error("cycleStages must not be empty")
    }
    const state = stateWith({ selectedStageId: lastStage.id, completedStageIds: [] })

    // When
    const next = reduceState(state, { kind: "advanceStage" })

    // Then
    expect(next.selectedStageId).toBe(firstStage.id)
    expect(next.completedStageIds).toContain(lastStage.id)
  })

  it("does not duplicate the id when the prior stage was already completed", () => {
    // Given
    const state = stateWith({ selectedStageId: "projetar", completedStageIds: ["projetar"] })

    // When
    const next = reduceState(state, { kind: "advanceStage" })

    // Then
    const projetarCount = next.completedStageIds.filter((id) => id === "projetar").length
    expect(projetarCount).toBe(1)
  })
})
