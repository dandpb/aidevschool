import { getCurrentProject } from "../progress"
import type { AppState } from "../state"

export function renderProject(_state: AppState): string {
  const project = getCurrentProject()

  const functionalItems =
    project.functionalRequirements?.map((item) => `<li>${item}</li>`).join("") ?? ""

  const nonFunctionalItems =
    project.nonFunctionalRequirements?.map((item) => `<li>${item}</li>`).join("") ?? ""

  const extraDoneItems = project.extraDoneCriteria?.map((item) => `<li>${item}</li>`).join("") ?? ""

  return `
    <section class="workbench project-view" aria-label="Primeiro projeto prático">
      <div class="section-heading">
        <p class="eyebrow">Projeto 01</p>
        <h2>${project.title}</h2>
      </div>

      <div class="briefing-grid">
        <article class="briefing-main">
          <h3>Objetivo de aprendizado</h3>
          <p>${project.learningGoal}</p>
          ${functionalItems ? `<h3>Requisitos funcionais</h3><ul>${functionalItems}</ul>` : ""}
          ${nonFunctionalItems ? `<h3>Requisitos não funcionais</h3><ul>${nonFunctionalItems}</ul>` : ""}
        </article>

        <aside class="quality-card">
          <h3>Definition of Done</h3>
          <ul>
            ${project.evidence.map((item) => `<li>${item}</li>`).join("")}
            ${extraDoneItems}
          </ul>
        </aside>
      </div>
    </section>
  `
}
