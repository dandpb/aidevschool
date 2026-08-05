import { cycleStageIndices } from "../cycle"
import { cycleStages } from "../data/cycle"
import type { CycleStage } from "../domain"
import type { AppState } from "../state"
import { currentAttrs } from "./activeAttrs"
import { escapeHtml } from "./escape"

export type CycleViewModel = {
  readonly stages: readonly {
    readonly stage: CycleStage
    readonly index: number
    readonly isSelected: boolean
    readonly isCompleted: boolean
  }[]
  readonly selectedStage: CycleStage
  readonly progress: number
}

export function buildCycleViewModel(state: AppState): CycleViewModel {
  // ⚡ Bolt: Use pre-computed map instead of O(n) .findIndex() array scan
  const selectedIndex = cycleStageIndices.get(state.selectedStageId) ?? -1
  const completedIds = new Set(state.completedStageIds)
  const stages = cycleStages.map((stage, index) => ({
    stage,
    index,
    isSelected: stage.id === state.selectedStageId,
    isCompleted: completedIds.has(stage.id),
  }))
  const fallbackStage = cycleStages[0]
  if (fallbackStage === undefined) {
    throw new Error("cycleStages must not be empty")
  }
  const selectedStage = cycleStages[selectedIndex] ?? fallbackStage
  const progress = Math.round((state.completedStageIds.length / cycleStages.length) * 100)

  return { stages, selectedStage, progress }
}

export function renderCycle(state: AppState): string {
  const model = buildCycleViewModel(state)

  return `
    <section class="workbench cycle-view" aria-label="Ciclo operacional">
      <div class="section-heading">
        <p class="eyebrow">Loop contínuo</p>
        <h2>Pequenos passos, evidência antes de avanço</h2>
      </div>

      <div class="cycle-board">
        <div class="timeline">
          ${model.stages
            .map(({ stage, index, isSelected, isCompleted }) => {
              const { className, aria } = currentAttrs(isSelected, "step")
              const completed = isCompleted ? "is-complete" : ""
              const statusText = isCompleted ? "concluído" : "pendente"
              const selectionText = isSelected ? ", atual" : ""
              const ariaLabel = `Etapa ${index + 1}: ${stage.label} (${statusText}${selectionText})`

              return `
                <button class="timeline-step ${className} ${completed}" type="button" data-stage="${escapeHtml(stage.id)}"${aria} aria-label="${escapeHtml(ariaLabel)}">
                  <span aria-hidden="true">${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
                  <span aria-hidden="true">${escapeHtml(stage.label)}</span>
                </button>
              `
            })
            .join("")}
        </div>

        <article class="stage-detail">
          <div class="console-header">
            <span>${escapeHtml(model.selectedStage.owner)}</span>
            <span>${escapeHtml(model.progress)}% validado</span>
          </div>
          <h3>${escapeHtml(model.selectedStage.label)}</h3>
          <dl class="evidence-list">
            <div>
              <dt>Evidência exigida</dt>
              <dd>${escapeHtml(model.selectedStage.evidence)}</dd>
            </div>
            <div>
              <dt>Artefato gerado</dt>
              <dd>${escapeHtml(model.selectedStage.output)}</dd>
            </div>
          </dl>
          <button class="action-button" type="button" data-action="advance-stage">Concluir etapa</button>
        </article>
      </div>
    </section>
  `
}
