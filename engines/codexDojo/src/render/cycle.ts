import { getCycleCompletionPercent } from "../cycle"
import { getCurrentStage, getStages, isStageCompleted } from "../progress"
import type { AppState } from "../state"
import { currentAttrs } from "./activeAttrs"
import { escapeHtml } from "./escape"

export function renderCycle(state: AppState): string {
  const selectedStage = getCurrentStage(state)
  const progress = getCycleCompletionPercent(state.completedStageIds)

  return `
    <section class="workbench cycle-view" aria-label="Ciclo operacional">
      <div class="section-heading">
        <p class="eyebrow">Loop contínuo</p>
        <h2>Pequenos passos, evidência antes de avanço</h2>
      </div>

      <div class="cycle-board">
        <div class="timeline">
          ${getStages()
            .map((stage, index) => {
              const { className, aria } = currentAttrs(stage.id === selectedStage.id, "step")
              const isCompleted = isStageCompleted(state, stage.id)
              const completedClass = isCompleted ? "is-complete" : ""
              const completedText = isCompleted ? " (Concluída)" : " (Pendente)"

              return `
                <button class="timeline-step ${className} ${completedClass}" type="button" data-stage="${escapeHtml(stage.id)}" aria-label="Etapa ${index + 1}: ${escapeHtml(stage.label)}${completedText}"${aria}>
                  <span aria-hidden="true">${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
                  ${escapeHtml(stage.label)}
                </button>
              `
            })
            .join("")}
        </div>

        <article class="stage-detail">
          <div class="console-header">
            <span>${escapeHtml(selectedStage.owner)}</span>
            <span>${escapeHtml(progress)}% validado</span>
          </div>
          <h3>${escapeHtml(selectedStage.label)}</h3>
          <dl class="evidence-list">
            <div>
              <dt>Evidência exigida</dt>
              <dd>${escapeHtml(selectedStage.evidence)}</dd>
            </div>
            <div>
              <dt>Artefato gerado</dt>
              <dd>${escapeHtml(selectedStage.output)}</dd>
            </div>
          </dl>
          <button class="action-button" type="button" data-action="advance-stage">Concluir etapa</button>
        </article>
      </div>
    </section>
  `
}
