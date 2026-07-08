import { getCycleCompletionPercent } from "../cycle"
import { getCurrentStage, getStages, isStageCompleted } from "../progress"
import type { AppState } from "../state"
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
              const selected = stage.id === selectedStage.id ? "is-active" : ""
              const completed = isStageCompleted(state, stage.id) ? "is-complete" : ""
              const ariaCurrent = stage.id === selectedStage.id ? ' aria-current="step"' : ""
              return `
                <button class="timeline-step ${selected} ${completed}" type="button" data-stage="${escapeHtml(stage.id)}"${ariaCurrent}>
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  ${escapeHtml(stage.label)}
                </button>
              `
            })
            .join("")}
        </div>

        <article class="stage-detail">
          <div class="console-header">
            <span>${escapeHtml(selectedStage.owner)}</span>
            <span>${progress}% validado</span>
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
