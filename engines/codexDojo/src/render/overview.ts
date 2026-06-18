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

export function renderOverview(state: AppState): string {
  const model = getOverviewModel(state)

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
          <span>${model.stats.completionPercent}% do ciclo</span>
        </div>
        <div class="meter" aria-label="Progresso do ciclo">
          <span style="width: ${model.stats.completionPercent}%"></span>
        </div>
        <dl class="stat-grid">
          <div><dt>Agentes</dt><dd>${model.stats.agents}</dd></div>
          <div><dt>Etapas</dt><dd>${model.stats.stages}</dd></div>
          <div><dt>Projetos</dt><dd>${model.stats.projects}</dd></div>
        </dl>
      </article>

      <article class="topology" aria-label="Mapa visual dos agentes">
        ${model.visibleAgents
          .map(
            (agent, index) =>
              `<button class="agent-node node-${index + 1}" type="button" data-agent="${agent.id}">
                <span>${agent.name}</span>
              </button>`,
          )
          .join("")}
      </article>

      <article class="next-project">
        <p class="eyebrow">Primeiro projeto prático</p>
        <h2>${model.currentProject.title}</h2>
        <p>${model.currentProject.learningGoal}</p>
        <ul>
          ${model.currentProject.evidence.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </article>

      <article class="metric-strip">
        ${model.metrics
          .map(
            (metric) => `
              <div class="metric-item">
                <span>${metric.label}</span>
                <strong>${metric.target}</strong>
                <small>${metric.signal}</small>
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
                <span>${status.label}</span>
                <strong>${status.state}</strong>
                <p>${status.evidence}</p>
                <small>${status.nextStep}</small>
              </div>
            `,
          )
          .join("")}
      </article>

      <article class="cycle-strip">
        ${model.visibleStages
          .map(
            (stage) => `
              <button class="stage-chip" type="button" data-stage="${stage.id}">
                <span>${stage.owner}</span>
                ${stage.label}
              </button>
            `,
          )
          .join("")}
      </article>
    </section>
  `
}
