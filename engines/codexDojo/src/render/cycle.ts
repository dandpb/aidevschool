import { cycleStages } from "../data/cycle"
import { findStage, getCompletionPercent } from "../progress"
import type { AppState } from "../state"

export function renderCycle(state: AppState): string {
  const selectedStage = findStage(state.selectedStageId)
  const progress = getCompletionPercent(state.completedStageIds)

  return `
    <section class="workbench cycle-view" aria-label="Ciclo operacional">
      <div class="section-heading">
        <p class="eyebrow">Loop contínuo</p>
        <h2>Pequenos passos, evidência antes de avanço</h2>
      </div>

      <div class="cycle-board">
        <div class="timeline">
          ${cycleStages
            .map((stage, index) => {
              const selected = stage.id === selectedStage.id ? "is-active" : ""
              const completed = state.completedStageIds.includes(stage.id) ? "is-complete" : ""
              return `
                <button class="timeline-step ${selected} ${completed}" type="button" data-stage="${stage.id}">
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  ${stage.label}
                </button>
              `
            })
            .join("")}
        </div>

        <article class="stage-detail">
          <div class="console-header">
            <span>${selectedStage.owner}</span>
            <span>${progress}% validado</span>
          </div>
          <h3>${selectedStage.label}</h3>
          <dl class="evidence-list">
            <div>
              <dt>Evidência exigida</dt>
              <dd>${selectedStage.evidence}</dd>
            </div>
            <div>
              <dt>Artefato gerado</dt>
              <dd>${selectedStage.output}</dd>
            </div>
          </dl>
          <button class="action-button" type="button" data-action="advance-stage">Concluir etapa</button>
        </article>
      </div>
    </section>
  `
}
