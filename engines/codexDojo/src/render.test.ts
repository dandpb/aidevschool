import { describe, expect, it } from "vitest"
import { getCycleCompletionPercent } from "./cycle"
import { agents } from "./data/agents"
import { projects } from "./data/projects"
import { getCurrentProject, getSelectedProject } from "./progress"
import { renderShell } from "./render/shell"
import { type AppState, buildInitialState } from "./state"

const stateWith = (overrides: Partial<AppState>): AppState => ({
  ...buildInitialState("maestro", "diagnosticar"),
  ...overrides,
})

describe("renderShell — targeted assertions", () => {
  it("overview: contains brand, completion percent, 14 agent nodes, 6 stage chips", () => {
    const html = renderShell(stateWith({ view: "overview" }))

    expect(html).toContain("codexDojo")
    expect(html).toContain("20% do ciclo")

    const agentNodes = html.match(/class="agent-node/g)
    expect(agentNodes).toHaveLength(14)

    const stageChips = html.match(/class="stage-chip/g)
    expect(stageChips).toHaveLength(6)
  })

  it("overview: surfaces ecosystem contracts and metric signals", () => {
    const html = renderShell(stateWith({ view: "overview" }))

    expect(html).toContain("Learning gate")
    expect(html).toContain("Legacy/refactor")
    expect(html).toContain("ecosystem/LEGACY_MIGRATION.md")
    expect(html).toContain("Mostra se o design ou runtime virou gargalo.")
  })

  it("agents (selected=critico): critico row is active, others are not", () => {
    const html = renderShell(stateWith({ view: "agents", selectedAgentId: "critico" }))

    expect(html).toContain("10</strong><small>agentes user-facing")
    expect(html).toContain("14</strong><small>sub-agentes especializados")
    expect(html).toContain("Mentor")
    expect(html).toContain("Expande para: maestro, sonda, socrates")

    const criticoRow = html.match(/<button[^>]*data-agent="critico"[^>]*>/)
    expect(criticoRow?.[0]).toContain("is-active")

    const otherAgents = agents.filter((a) => a.id !== "critico")
    for (const agent of otherAgents) {
      const row = html.match(new RegExp(`<button[^>]*data-agent="${agent.id}"[^>]*>`))
      expect(row?.[0]).not.toContain("is-active")
    }
  })

  it("agents copied state: shows Copiado when copiedAgentId matches selected agent", () => {
    const html = renderShell(
      stateWith({ view: "agents", selectedAgentId: "cartografo", copiedAgentId: "cartografo" }),
    )

    expect(html).toContain("Copiado")
    const buttonMatch = html.match(/data-copy-agent="cartografo"[^>]*>[\s\n]*([^<]+)/)
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

  it("roadmap (filter=concorrencia): every card matches a concorrencia-phase project from data", () => {
    const html = renderShell(stateWith({ view: "roadmap", projectFilter: "concorrencia" }))

    const concurrencyProjects = projects.filter((p) => p.phase === "concorrencia")
    const cardTitles = html.match(/<h3>([^<]+)<\/h3>/g) ?? []

    expect(cardTitles).toHaveLength(concurrencyProjects.length)

    for (const project of concurrencyProjects) {
      expect(html).toContain(project.title)
      expect(html).toContain(`data-project="${project.id}"`)
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

  it("project: renders the selected project instead of always project 01", () => {
    const selectedProjectId = "p08"
    const html = renderShell(stateWith({ view: "project", selectedProjectId }))
    const project = getSelectedProject(stateWith({ selectedProjectId }))

    expect(html).toContain(project.title)
    expect(html).toContain(selectedProjectId.toUpperCase())
    expect(html).toContain('data-view="project"')
    expect(html).toContain(">Projeto</button>")
    expect(html).not.toContain(getCurrentProject().title)
  })
})
