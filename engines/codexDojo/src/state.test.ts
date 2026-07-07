import { describe, expect, it } from "vitest"
import { cycleStages } from "./data/cycle"
import { type AppState, buildInitialState, reduceState } from "./state"

// Characterization tests for the reducer — they capture current behavior so
// later structure-only refactors can be proven safe (snapshots for state).

const stateWith = (overrides: Partial<AppState>): AppState => ({
  ...buildInitialState("maestro", "diagnosticar"),
  ...overrides,
})

describe("reduceState — changeView", () => {
  it("sets the view and clears any ephemeral copied-agent state", () => {
    // Given
    const state = stateWith({ copiedAgentId: "critico" })

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
    const state = stateWith({ view: "overview", copiedAgentId: "critico" })

    // When
    const next = reduceState(state, { kind: "selectAgent", agentId: "cartografo" })

    // Then
    expect(next.selectedAgentId).toBe("cartografo")
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

describe("reduceState — selectProject", () => {
  it("selects the project and jumps to the project view", () => {
    // Given
    const state = stateWith({ view: "roadmap", selectedProjectId: "p01" })

    // When
    const next = reduceState(state, { kind: "selectProject", projectId: "p08" })

    // Then
    expect(next.selectedProjectId).toBe("p08")
    expect(next.view).toBe("project")
  })
})

describe("reduceState — setProjectFilter", () => {
  it("sets the filter and jumps to the roadmap view", () => {
    // Given
    const state = stateWith({ view: "overview" })

    // When
    const next = reduceState(state, { kind: "setProjectFilter", filter: "concorrencia" })

    // Then
    expect(next.projectFilter).toBe("concorrencia")
    expect(next.view).toBe("roadmap")
  })
})

describe("reduceState — selectLinuxApp", () => {
  it("selects the linux app and jumps to the linuxLab view", () => {
    // Given
    const state = stateWith({ view: "overview", selectedLinuxAppId: "terminal" })

    // When
    const next = reduceState(state, { kind: "selectLinuxApp", appId: "browser" })

    // Then
    expect(next.selectedLinuxAppId).toBe("browser")
    expect(next.view).toBe("linuxLab")
  })

  it("returns exactly the same state reference if the app is already selected and view is linuxLab", () => {
    // Given
    const state = stateWith({ view: "linuxLab", selectedLinuxAppId: "browser" })

    // When
    const next = reduceState(state, { kind: "selectLinuxApp", appId: "browser" })

    // Then
    expect(next).toBe(state) // Exact reference equality
  })
})

describe("reduceState — setLinuxAppCategoryFilter", () => {
  it("sets the linux app category filter and jumps to the linuxLab view", () => {
    // Given
    const state = stateWith({ view: "overview", linuxAppCategoryFilter: "all" })

    // When
    const next = reduceState(state, { kind: "setLinuxAppCategoryFilter", filter: "media" })

    // Then
    expect(next.linuxAppCategoryFilter).toBe("media")
    expect(next.view).toBe("linuxLab")
  })

  it("returns exactly the same state reference if the filter is already set and view is linuxLab", () => {
    // Given
    const state = stateWith({ view: "linuxLab", linuxAppCategoryFilter: "media" })

    // When
    const next = reduceState(state, { kind: "setLinuxAppCategoryFilter", filter: "media" })

    // Then
    expect(next).toBe(state) // Exact reference equality
  })
})

describe("reduceState — markCopied", () => {
  it("records the copied agent id", () => {
    // Given
    const state = stateWith({ copiedAgentId: null })

    // When
    const next = reduceState(state, { kind: "markCopied", agentId: "critico" })

    // Then
    expect(next.copiedAgentId).toBe("critico")
  })

  it("clears the copied agent id when given null", () => {
    // Given
    const state = stateWith({ copiedAgentId: "critico" })

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
