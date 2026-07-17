import { describe, expect, it } from "vitest"
import { advanceCycle, getCycleCompletionPercent } from "./cycle"
import { cycleStages } from "./data/cycle"
import {
  findAgent,
  findProject,
  findStage,
  getAgents,
  getCurrentStage,
  getEcosystemStatuses,
  getProjects,
  getSelectedAgent,
  getSelectedProject,
  getUserFacingAgents,
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
      ...buildInitialState("maestro", "diagnosticar"),
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
    const agentId = "cartografo"
    const stageId = "revisar"

    // When
    const agent = findAgent(agentId)
    const stage = findStage(stageId)

    // Then
    expect(agent.name).toBe("CARTÓGRAFO")
    expect(stage.owner).toBe("Revisor")
  })

  it("loads configured projects by id", () => {
    // When
    const project = findProject("p04")

    // Then
    expect(project.title).toBe("Concurrent Task Queue")
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

  it("does not append an unknown selectedStageId to completedStageIds", () => {
    // Given
    const snapshot = { selectedStageId: "nonexistent", completedStageIds: [] }

    // When
    const next = advanceCycle(snapshot)

    // Then
    expect(next.completedStageIds).not.toContain("nonexistent")
    expect(next.completedStageIds).toHaveLength(0)
  })
})

describe("DojoQuery seam", () => {
  it("returns the selected agent", () => {
    // Given
    const state = {
      ...buildInitialState("maestro", "diagnosticar"),
      selectedAgentId: "cartografo",
    }

    // When
    const agent = getSelectedAgent(state)

    // Then
    expect(agent.name).toBe("CARTÓGRAFO")
  })

  it("returns the current stage", () => {
    // Given
    const state = {
      ...buildInitialState("maestro", "diagnosticar"),
      selectedStageId: "revisar",
    }

    // When
    const stage = getCurrentStage(state)

    // Then
    expect(stage.owner).toBe("Revisor")
  })

  it("returns the selected project", () => {
    // Given
    const state = {
      ...buildInitialState("maestro", "diagnosticar"),
      selectedProjectId: "p08",
    }

    // When
    const project = getSelectedProject(state)

    // Then
    expect(project.id).toBe("p08")
  })

  it("returns all projects by default", () => {
    // When
    const all = getProjects()

    // Then
    expect(all.length).toBeGreaterThan(0)
    expect(all.length).toBeGreaterThanOrEqual(getProjects("concorrencia").length)
  })

  it("filters projects by phase", () => {
    // When
    const concurrencyProjects = getProjects("concorrencia")

    // Then
    expect(concurrencyProjects.every((project) => project.phase === "concorrencia")).toBe(true)
    expect(concurrencyProjects.length).toBeGreaterThan(0)
  })

  it("reuses the cached project group for repeated phase queries", () => {
    const concurrencyProjects = getProjects("concorrencia")

    expect(concurrencyProjects).toBe(getProjects("concorrencia"))
    expect(Object.isFrozen(concurrencyProjects)).toBe(true)
  })

  it("reports a stage as completed only when it is in the completed list", () => {
    // Given
    const state = {
      ...buildInitialState("maestro", "diagnosticar"),
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
    expect(roster).toHaveLength(14)
    expect(roster.some((agent) => agent.id === "maestro")).toBe(true)
  })

  it("exposes the user-facing 10-agent product surface", () => {
    // When
    const surface = getUserFacingAgents()

    // Then
    expect(surface).toHaveLength(10)
    expect(surface.map((agent) => agent.name)).toContain("Mentor")
    expect(surface.every((agent) => agent.expandsTo.length > 0)).toBe(true)
  })

  it("exposes ecosystem status cards for dashboard contract coverage", () => {
    // When
    const statuses = getEcosystemStatuses()

    // Then
    expect(statuses.some((status) => status.id === "legacy-refactor")).toBe(true)
    expect(statuses.every((status) => status.evidence.length > 0)).toBe(true)
  })
})
