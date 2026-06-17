import { describe, expect, it } from "vitest"
import { advanceCycle, getCycleCompletionPercent } from "./cycle"
import { cycleStages } from "./data/cycle"
import {
  findAgent,
  findStage,
  getAgents,
  getCurrentStage,
  getProjects,
  getSelectedAgent,
  isStageCompleted,
} from "./progress"
import { buildInitialState, reduceState } from "./state"

describe("codexDojo progress model", () => {
  it("computes completion percent when known stages are completed", () => {
    // Given
    const firstTwoStages = cycleStages.slice(0, 2).map((stage) => stage.id)

    // When
    const percent = getCycleCompletionPercent(firstTwoStages)

    // Then
    expect(percent).toBe(20)
  })

  it("advances the selected stage and records the prior stage as completed", () => {
    // Given
    const state = {
      ...buildInitialState("mentor", "diagnosticar"),
      selectedStageId: "projetar",
      completedStageIds: [],
    }

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

describe("Cycle module", () => {
  it("advances to the next stage and marks current as completed", () => {
    // Given
    const snapshot = { selectedStageId: "projetar", completedStageIds: [] }

    // When
    const next = advanceCycle(snapshot)

    // Then
    expect(next.selectedStageId).toBe("implementar")
    expect(next.completedStageIds).toContain("projetar")
  })

  it("wraps around to the first stage after the last stage", () => {
    // Given
    const firstStage = cycleStages[0]
    const lastStage = cycleStages[cycleStages.length - 1]
    if (firstStage === undefined || lastStage === undefined) {
      throw new Error("cycleStages must not be empty")
    }
    const snapshot = {
      selectedStageId: lastStage.id,
      completedStageIds: cycleStages.slice(0, -1).map((stage) => stage.id),
    }

    // When
    const next = advanceCycle(snapshot)

    // Then
    expect(next.selectedStageId).toBe(firstStage.id)
  })

  it("does not duplicate completed stage ids", () => {
    // Given
    const snapshot = { selectedStageId: "projetar", completedStageIds: ["projetar"] }

    // When
    const next = advanceCycle(snapshot)

    // Then
    expect(next.completedStageIds.filter((id) => id === "projetar").length).toBe(1)
  })

  it("reports zero completion when no stages are completed", () => {
    expect(getCycleCompletionPercent([])).toBe(0)
  })

  it("reports full completion when all stages are completed", () => {
    expect(getCycleCompletionPercent(cycleStages.map((stage) => stage.id))).toBe(100)
  })

  it("does not throw and returns a defined stage when selectedStageId is unknown", () => {
    // Given
    const snapshot = { selectedStageId: "nonexistent", completedStageIds: [] }

    // When / Then
    expect(() => advanceCycle(snapshot)).not.toThrow()
    const next = advanceCycle(snapshot)
    expect(next.selectedStageId).toBeDefined()
    expect(cycleStages.some((stage) => stage.id === next.selectedStageId)).toBe(true)
  })
})

describe("DojoQuery seam", () => {
  it("returns the selected agent", () => {
    // Given
    const state = {
      ...buildInitialState("mentor", "diagnosticar"),
      selectedAgentId: "arquiteto",
    }

    // When
    const agent = getSelectedAgent(state)

    // Then
    expect(agent.name).toBe("Arquiteto")
  })

  it("returns the current stage", () => {
    // Given
    const state = {
      ...buildInitialState("mentor", "diagnosticar"),
      selectedStageId: "revisar",
    }

    // When
    const stage = getCurrentStage(state)

    // Then
    expect(stage.owner).toBe("Revisor")
  })

  it("returns all projects by default", () => {
    // When
    const all = getProjects()

    // Then
    expect(all.length).toBeGreaterThan(0)
    expect(all.length).toBeGreaterThanOrEqual(getProjects("apps").length)
  })

  it("filters projects by phase", () => {
    // When
    const appsProjects = getProjects("apps")

    // Then
    expect(appsProjects.every((project) => project.phase === "apps")).toBe(true)
    expect(appsProjects.length).toBeGreaterThan(0)
  })

  it("reports a stage as completed only when it is in the completed list", () => {
    // Given
    const state = {
      ...buildInitialState("mentor", "diagnosticar"),
      completedStageIds: ["diagnosticar"],
    }

    // Then
    expect(isStageCompleted(state, "diagnosticar")).toBe(true)
    expect(isStageCompleted(state, "escolher")).toBe(false)
  })

  it("exposes the configured agent roster", () => {
    // When
    const roster = getAgents()

    // Then
    expect(roster.length).toBeGreaterThan(0)
    expect(roster.some((agent) => agent.id === "arquiteto")).toBe(true)
  })
})
