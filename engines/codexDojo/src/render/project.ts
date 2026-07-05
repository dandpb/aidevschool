import { getSelectedProject } from "../progress"
import type { AppState } from "../state"
import { escapeHtml } from "./escape"

/**
 * Render the active project view.
 *
 * The selected project is read through a query seam so roadmap clicks and future
 * persisted learner state can choose the same briefing surface.
 */
export function renderProject(state: AppState): string {
  const project = getSelectedProject(state)

  const functionalItems =
    project.functionalRequirements?.map((item) => `<li>${escapeHtml(item)}</li>`).join("") ?? ""

  const nonFunctionalItems =
    project.nonFunctionalRequirements?.map((item) => `<li>${escapeHtml(item)}</li>`).join("") ?? ""

  const extraDoneItems =
    project.extraDoneCriteria?.map((item) => `<li>${escapeHtml(item)}</li>`).join("") ?? ""

  return `
    <section class="workbench project-view" aria-label="Projeto selecionado">
      <div class="section-heading">
        <p class="eyebrow">${escapeHtml(project.id.toUpperCase())}</p>
        <h2>${escapeHtml(project.title)}</h2>
      </div>

      <div class="briefing-grid">
        <article class="briefing-main">
          <h3>Objetivo de aprendizado</h3>
          <p>${escapeHtml(project.learningGoal)}</p>
          ${functionalItems ? `<h3>Requisitos funcionais</h3><ul>${functionalItems}</ul>` : ""}
          ${nonFunctionalItems ? `<h3>Requisitos não funcionais</h3><ul>${nonFunctionalItems}</ul>` : ""}
        </article>

        <aside class="quality-card">
          <h3>Definition of Done</h3>
          <ul>
            ${project.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            ${extraDoneItems}
          </ul>
        </aside>
      </div>
    </section>
  `
}
