import { describe, expect, it } from "vitest"
import { agents } from "../data/agents"
import { cycleStages, metrics } from "../data/cycle"
import { ecosystemStatuses } from "../data/ecosystem"
import { projects } from "../data/projects"
import { buildInitialState } from "../state"
import { buildOverviewModel } from "./overviewModel"

describe("buildOverviewModel", () => {
  const state = buildInitialState("maestro", "diagnosticar")

  it("limits visible agents to 14 and stages to 6", () => {
    const model = buildOverviewModel(state)

    expect(model.visibleAgents).toHaveLength(Math.min(agents.length, 14))
    expect(model.visibleStages).toHaveLength(Math.min(cycleStages.length, 6))
  })

  it("uses the first level->=1 project as the current project", () => {
    const model = buildOverviewModel(state)
    const expected = projects.find((p) => p.level >= 1) ?? projects[0]

    expect(model.currentProject).toBe(expected)
  })

  it("exposes metrics and ecosystem statuses directly", () => {
    const model = buildOverviewModel(state)

    expect(model.metrics).toBe(metrics)
    expect(model.ecosystemStatuses).toBe(ecosystemStatuses)
  })

  it("normalizes dashboard stats", () => {
    const model = buildOverviewModel(state)

    expect(model.stats.agents).toBe(agents.length)
    expect(model.stats.stages).toBe(cycleStages.length)
    expect(model.stats.projects).toBe(projects.length)
    expect(model.stats.completionPercent).toBeGreaterThanOrEqual(0)
    expect(model.stats.completionPercent).toBeLessThanOrEqual(100)
  })
})
