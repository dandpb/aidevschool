import { getAgents, getCurrentProject, getDashboardStats, getMetrics, getStages } from "../progress"
import type { AppState } from "../state"

export function renderOverview(state: AppState): string {
  const stats = getDashboardStats(state)
  const currentProject = getCurrentProject()

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
          <span>${stats.completionPercent}% do ciclo</span>
        </div>
        <div class="meter" aria-label="Progresso do ciclo">
          <span style="width: ${stats.completionPercent}%"></span>
        </div>
        <dl class="stat-grid">
          <div><dt>Agentes</dt><dd>${stats.agents}</dd></div>
          <div><dt>Etapas</dt><dd>${stats.stages}</dd></div>
          <div><dt>Projetos</dt><dd>${stats.projects}</dd></div>
        </dl>
      </article>

      <article class="topology" aria-label="Mapa visual dos agentes">
        ${getAgents()
          .slice(0, 10)
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
        <h2>${currentProject.title}</h2>
        <p>${currentProject.learningGoal}</p>
        <ul>
          ${currentProject.evidence.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </article>

      <article class="metric-strip">
        ${getMetrics()
          .map(
            (metric) => `
              <div class="metric-item">
                <span>${metric.label}</span>
                <strong>${metric.target}</strong>
              </div>
            `,
          )
          .join("")}
      </article>

      <article class="cycle-strip">
        ${getStages()
          .slice(0, 6)
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
