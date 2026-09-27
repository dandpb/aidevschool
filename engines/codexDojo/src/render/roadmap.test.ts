import { describe, expect, it } from "vitest"
import { projects } from "../data/projects"
import { type AppState, buildInitialState } from "../state"
import { escapeHtml } from "./escape"
import { renderRoadmap } from "./roadmap"

const stateWith = (overrides: Partial<AppState>): AppState => ({
  ...buildInitialState("maestro", "diagnosticar"),
  ...overrides,
})

describe("renderRoadmap", () => {
  it("renders roadmap heading, filter buttons, and all projects when filter is 'all'", () => {
    const html = renderRoadmap(stateWith({ projectFilter: "all" }))

    expect(html).toContain("Trilha viva")
    expect(html).toContain("Projetos incrementais que viram sistemas robustos")

    const allButtonMatch = html.match(/<button[^>]*data-filter="all"[^>]*>/)
    expect(allButtonMatch?.[0]).toContain("is-active")
    expect(allButtonMatch?.[0]).toContain('aria-pressed="true"')
    expect(allButtonMatch?.[0]).toContain('aria-label="Filtrar por Todos"')

    for (const project of projects) {
      expect(html).toContain(escapeHtml(project.title))
      expect(html).toContain(`data-project="${escapeHtml(project.id)}"`)
      expect(html).toContain(`aria-label="Abrir briefing de projeto: ${escapeHtml(project.title)}"`)
    }
  })

  it("renders active attributes for filtered phase and filters project cards accordingly", () => {
    const html = renderRoadmap(stateWith({ projectFilter: "concorrencia" }))

    const allButtonMatch = html.match(/<button[^>]*data-filter="all"[^>]*>/)
    expect(allButtonMatch?.[0]).not.toContain("is-active")
    expect(allButtonMatch?.[0]).toContain('aria-pressed="false"')

    const filterButtonMatch = html.match(/<button[^>]*data-filter="concorrencia"[^>]*>/)
    expect(filterButtonMatch?.[0]).toContain("is-active")
    expect(filterButtonMatch?.[0]).toContain('aria-pressed="true"')
    expect(filterButtonMatch?.[0]).toContain('aria-label="Filtrar por Concorrência"')

    const concurrencyProjects = projects.filter((p) => p.phase === "concorrencia")
    const otherProjects = projects.filter((p) => p.phase !== "concorrencia")

    for (const project of concurrencyProjects) {
      expect(html).toContain(escapeHtml(project.title))
    }

    for (const project of otherProjects) {
      expect(html).not.toContain(escapeHtml(project.title))
    }
  })

  it("renders project level, language, and architecture metadata", () => {
    const html = renderRoadmap(stateWith({ projectFilter: "all" }))

    const firstProject = projects[0]
    expect(firstProject).toBeDefined()
    if (!firstProject) return

    expect(html).toContain(`<span>${escapeHtml(firstProject.id.toUpperCase())}</span>`)
    expect(html).toContain(`<span>Nível ${escapeHtml(firstProject.level)}</span>`)
    expect(html).toContain(`<dd>${escapeHtml(firstProject.language)}</dd>`)
    expect(html).toContain(`<dd>${escapeHtml(firstProject.architecture)}</dd>`)
  })
})
