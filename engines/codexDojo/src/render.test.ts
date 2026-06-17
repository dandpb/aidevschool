import { describe, expect, it } from "vitest"
import { getCycleCompletionPercent } from "./cycle"
import { agents } from "./data/agents"
import { projects } from "./data/projects"
import { getCurrentProject } from "./progress"
import { renderShell } from "./render/shell"
import { type AppState, buildInitialState } from "./state"

const stateWith = (overrides: Partial<AppState>): AppState => ({
  ...buildInitialState("mentor", "diagnosticar"),
  ...overrides,
})

describe("renderShell — targeted assertions", () => {
  it("overview: contains brand, completion percent, 10 agent nodes, 6 stage chips", () => {
    const html = renderShell(stateWith({ view: "overview" }))

    expect(html).toContain("codexDojo")
    expect(html).toContain("20% do ciclo")

    const agentNodes = html.match(/class="agent-node/g)
    expect(agentNodes).toHaveLength(10)

    const stageChips = html.match(/class="stage-chip/g)
    expect(stageChips).toHaveLength(6)
  })

  it("agents (selected=revisor): revisor row is active, others are not", () => {
    const html = renderShell(stateWith({ view: "agents", selectedAgentId: "revisor" }))

    const revisorRow = html.match(/<button[^>]*data-agent="revisor"[^>]*>/)
    expect(revisorRow?.[0]).toContain("is-active")

    const otherAgents = agents.filter((a) => a.id !== "revisor")
    for (const agent of otherAgents) {
      const row = html.match(new RegExp(`<button[^>]*data-agent="${agent.id}"[^>]*>`))
      expect(row?.[0]).not.toContain("is-active")
    }
  })

  it("agents copied state: shows Copiado when copiedAgentId matches selected agent", () => {
    const html = renderShell(
      stateWith({ view: "agents", selectedAgentId: "arquiteto", copiedAgentId: "arquiteto" }),
    )

    expect(html).toContain("Copiado")
    const buttonMatch = html.match(/data-copy-agent="arquiteto"[^>]*>[\s\n]*([^<]+)/)
    expect(buttonMatch?.[1]?.trim()).toBe("Copiado")
  })

  it("cycle: completed stages have is-complete, revisar is active, progress text matches", () => {
    const completedStageIds = ["diagnosticar", "escolher"]
    const html = renderShell(
      stateWith({
        view: "cycle",
        selectedStageId: "revisar",
        completedStageIds,
      }),
    )

    const diagnosticar = html.match(/<button[^>]*data-stage="diagnosticar"[^>]*>/)
    expect(diagnosticar?.[0]).toContain("is-complete")

    const escolher = html.match(/<button[^>]*data-stage="escolher"[^>]*>/)
    expect(escolher?.[0]).toContain("is-complete")

    const revisar = html.match(/<button[^>]*data-stage="revisar"[^>]*>/)
    expect(revisar?.[0]).toContain("is-active")

    const progress = getCycleCompletionPercent(completedStageIds)
    expect(html).toContain(`${progress}% validado`)
  })

  it("roadmap (filter=apps): every card matches an apps-phase project from data", () => {
    const html = renderShell(stateWith({ view: "roadmap", projectFilter: "apps" }))

    const appsProjects = projects.filter((p) => p.phase === "apps")
    const cardTitles = html.match(/<h3>([^<]+)<\/h3>/g) ?? []

    expect(cardTitles).toHaveLength(appsProjects.length)

    for (const project of appsProjects) {
      expect(html).toContain(project.title)
    }
  })

  it("project: contains project 01 title and all requirement strings from getCurrentProject()", () => {
    const html = renderShell(stateWith({ view: "project" }))
    const project = getCurrentProject()

    expect(html).toContain(project.title)

    for (const req of project.functionalRequirements ?? []) {
      expect(html).toContain(req)
    }

    for (const req of project.nonFunctionalRequirements ?? []) {
      expect(html).toContain(req)
    }

    for (const criterion of project.extraDoneCriteria ?? []) {
      expect(html).toContain(criterion)
    }
  })
})
