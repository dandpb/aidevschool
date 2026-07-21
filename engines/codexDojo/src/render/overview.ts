import type { Agent, CycleStage, DojoProject, EcosystemStatus, Metric } from "../domain"
import {
  type DashboardStats,
  getAgents,
  getCurrentProject,
  getDashboardStats,
  getEcosystemStatuses,
  getMetrics,
  getStages,
} from "../progress"
import type { AppState } from "../state"
import { escapeHtml } from "./escape"
import { renderLearnerDashboard } from "./learner"

const OVERVIEW_AGENT_LIMIT = 14
const OVERVIEW_STAGE_LIMIT = 6

type OverviewModel = {
  readonly stats: DashboardStats
  readonly visibleAgents: readonly Agent[]
  readonly currentProject: DojoProject
  readonly metrics: readonly Metric[]
  readonly ecosystemStatuses: readonly EcosystemStatus[]
  readonly visibleStages: readonly CycleStage[]
}

function getOverviewModel(state: AppState): OverviewModel {
  return {
    stats: getDashboardStats(state),
    visibleAgents: getAgents().slice(0, OVERVIEW_AGENT_LIMIT),
    currentProject: getCurrentProject(),
    metrics: getMetrics(),
    ecosystemStatuses: getEcosystemStatuses(),
    visibleStages: getStages().slice(0, OVERVIEW_STAGE_LIMIT),
  }
}

function normalizePercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return Math.min(100, Math.max(0, value))
}

export function renderOverview(state: AppState): string {
  const model = getOverviewModel(state)
  const completionPercent = normalizePercent(model.stats.completionPercent)

  return `
    <section class="overview-grid" aria-label="Painel operacional">
      <article class="command-panel">
        <p class="eyebrow">Laboratório contínuo</p>
        <h1>codexDojo</h1>
        <p class="lead">
          Um painel para conduzir uma escola prática de engenharia de software com agentes,
          projetos incrementais, revisão, testes, métricas e memória de aprendizado.
        </p>
        <div class="primary-actions">
          <button class="action-button" type="button" data-view="cycle">Avançar ciclo</button>
          <button class="action-button secondary" type="button" data-view="agents">Ver agentes</button>
        </div>
      </article>

      <article class="status-console">
        <div class="console-header">
          <span>Estado do dojo</span>
          <span>${escapeHtml(completionPercent)}% do ciclo</span>
        </div>
        <div class="meter" role="progressbar" aria-label="Progresso do ciclo" aria-valuenow="${escapeHtml(completionPercent)}" aria-valuemin="0" aria-valuemax="100">
          <span style="width: ${escapeHtml(completionPercent)}%"></span>
        </div>
        <dl class="stat-grid">
          <div><dt>Agentes</dt><dd>${escapeHtml(model.stats.agents)}</dd></div>
          <div><dt>Etapas</dt><dd>${escapeHtml(model.stats.stages)}</dd></div>
          <div><dt>Projetos</dt><dd>${escapeHtml(model.stats.projects)}</dd></div>
        </dl>
      </article>

      <article class="topology" aria-label="Mapa visual dos agentes">
        ${model.visibleAgents
          .map((agent, index) => {
            const nodeNumber = index + 1
            const ariaLabel = `Nó ${nodeNumber}: ${agent.name}`
            return `<button class="agent-node node-${nodeNumber}" type="button" data-agent="${escapeHtml(agent.id)}" aria-label="${escapeHtml(ariaLabel)}">
                <span aria-hidden="true">${escapeHtml(agent.name)}</span>
              </button>`
          })
          .join("")}
      </article>

      <article class="next-project">
        <p class="eyebrow">Primeiro projeto prático</p>
        <h2>${escapeHtml(model.currentProject.title)}</h2>
        <p>${escapeHtml(model.currentProject.learningGoal)}</p>
        <ul>
          ${model.currentProject.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </article>

      <article class="metric-strip">
        ${model.metrics
          .map(
            (metric) => `
              <div class="metric-item">
                <span>${escapeHtml(metric.label)}</span>
                <strong>${escapeHtml(metric.measurement ?? "não medido ainda")}</strong>
                <small>Meta: ${escapeHtml(metric.target)}</small>
                <small>${escapeHtml(metric.signal)}</small>
                ${metric.evidencePath ? `<code>${escapeHtml(metric.evidencePath)}</code>` : ""}
              </div>
            `,
          )
          .join("")}
      </article>

      <article class="ecosystem-strip" aria-label="Contratos do ecossistema">
        ${model.ecosystemStatuses
          .map(
            (status) => `
              <div class="ecosystem-card">
                <span>${escapeHtml(status.label)}</span>
                <strong>${escapeHtml(status.state)}</strong>
                <p>${escapeHtml(status.evidence)}</p>
                <small>${escapeHtml(status.nextStep)}</small>
              </div>
            `,
          )
          .join("")}
      </article>

      <article class="cycle-strip">
        ${model.visibleStages
          .map((stage, index) => {
            const ariaLabel = `Etapa ${index + 1}: ${stage.label} (Proprietário: ${stage.owner})`
            return `
              <button class="stage-chip" type="button" data-stage="${escapeHtml(stage.id)}" aria-label="${escapeHtml(ariaLabel)}">
                <span aria-hidden="true">${escapeHtml(stage.owner)}</span>
                <span aria-hidden="true">${escapeHtml(stage.label)}</span>
              </button>
            `
          })
          .join("")}
      </article>

      ${renderLearnerDashboard()}
    </section>
  `
}
