import { describe, expect, it } from "vitest"
import { getCycleCompletionPercent } from "./cycle"
import { agents } from "./data/agents"
import { projects } from "./data/projects"
import { getCurrentProject, getMetrics, getSelectedProject } from "./progress"
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

  it("overview: renders broad honest metrics without fake measurements", () => {
    const html = renderShell(stateWith({ view: "overview" }))
    const metricCards = html.match(/<div class="metric-item">[\s\S]*?<\/div>/g) ?? []

    expect(metricCards).toHaveLength(getMetrics().length)
    expect(metricCards.length).toBeGreaterThanOrEqual(8)
    expect(metricCards.some((card) => card.includes("não medido ainda"))).toBe(true)

    for (const card of metricCards) {
      const strongValue = card.match(/<strong>([^<]+)<\/strong>/)?.[1]?.trim()
      expect(strongValue).toBe("não medido ainda")
      expect(strongValue).not.toMatch(/\d/)
      expect(card).toContain("<small>Meta:")
    }
  })

  it("linuxLab: is bridge-only (no fake desktop tiles)", () => {
    const html = renderShell(stateWith({ view: "linuxLab" }))

    expect(html).toContain("Linux Lab")
    expect(html).not.toContain("linux-app-tile")
    expect(html).not.toContain("run-linux-lab")
    expect(html).toContain('data-codexdojo-os-launch="true"')
    expect(html).toContain("Abrir codexDojo OS")
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer"')
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
    const button = html.match(/<button[^>]*data-copy-agent="cartografo"[^>]*>/)
    expect(button?.[0]).toContain('aria-live="polite"')
    expect(button?.[0]).not.toContain("aria-label")
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
      expect(html).toContain(`aria-label="Abrir briefing: ${project.title}"`)
    }
  })

  it("project: contains selected project title and requirement strings", () => {
    const state = stateWith({ view: "project" })
    const html = renderShell(state)
    // Project view uses selection (default p01), not projects[0] / level-0 entry.
    const project = getSelectedProject(state)

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

  it("project: renders the selected project instead of the default selection", () => {
    const selectedProjectId = "p08"
    const state = stateWith({ view: "project", selectedProjectId })
    const html = renderShell(state)
    const project = getSelectedProject(state)
    const defaultSelected = getSelectedProject(stateWith({}))

    expect(html).toContain(project.title)
    expect(html).toContain(selectedProjectId.toUpperCase())
    expect(html).toContain('data-view="project"')
    expect(html).toContain(">Projeto</button>")
    expect(html).not.toContain(defaultSelected.title)
  })
})
