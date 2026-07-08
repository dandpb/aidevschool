import { type ProjectPhase, projectPhases } from "../domain"
import { getProjects } from "../progress"
import type { AppState, ProjectFilter } from "../state"
import { escapeHtml } from "./escape"

const phaseLabels: Readonly<Record<ProjectPhase, string>> = {
  fundamentos: "Fundamentos",
  concorrencia: "Concorrência",
  arquitetura: "Arquitetura",
  escalabilidade: "Escalabilidade",
  resiliencia: "Resiliência",
  sistemas_complexos: "Sistemas complexos",
}

export function renderRoadmap(state: AppState): string {
  const projects = getProjects(state.projectFilter)

  return `
    <section class="workbench roadmap-view" aria-label="Roadmap de projetos">
      <div class="section-heading">
        <p class="eyebrow">Trilha viva</p>
        <h2>Projetos incrementais que viram sistemas robustos</h2>
      </div>

      <div class="filter-row">
        ${renderFilterButton("all", "Todos", state.projectFilter)}
        ${projectPhases
          .map((phase) => renderFilterButton(phase, phaseLabels[phase], state.projectFilter))
          .join("")}
      </div>

      <div class="project-grid">
        ${projects
          .map(
            (project) => `
              <article class="project-card">
                <div class="project-meta">
                  <span>${escapeHtml(project.id.toUpperCase())}</span>
                  <span>Nível ${project.level}</span>
                </div>
                <h3>${escapeHtml(project.title)}</h3>
                <p>${escapeHtml(project.learningGoal)}</p>
                <dl>
                  <div><dt>Linguagem</dt><dd>${escapeHtml(project.language)}</dd></div>
                  <div><dt>Arquitetura</dt><dd>${escapeHtml(project.architecture)}</dd></div>
                </dl>
                <button class="inline-link" type="button" data-project="${escapeHtml(project.id)}">Abrir briefing</button>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `
}

function renderFilterButton(
  filter: ProjectFilter,
  label: string,
  currentFilter: ProjectFilter,
): string {
  const activeClass = filter === currentFilter ? "is-active" : ""
  const ariaPressed = filter === currentFilter ? ' aria-pressed="true"' : ""
  return `<button class="filter-button ${activeClass}" type="button" data-filter="${escapeHtml(filter)}"${ariaPressed}>${escapeHtml(label)}</button>`
}
