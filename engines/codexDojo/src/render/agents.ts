import { getAgents, getSelectedAgent } from "../progress"
import type { AppState } from "../state"

export function renderAgents(state: AppState): string {
  const selectedAgent = getSelectedAgent(state)

  return `
    <section class="workbench agents-view" aria-label="Agentes do codexDojo">
      <div class="section-heading">
        <p class="eyebrow">Equipe multiagente</p>
        <h2>Responsabilidades claras, saídas verificáveis</h2>
      </div>

      <div class="agent-list">
        ${getAgents()
          .map((agent) => {
            const activeClass = agent.id === selectedAgent.id ? "is-active" : ""
            return `
              <button class="agent-row ${activeClass}" type="button" data-agent="${agent.id}">
                <span>${agent.name}</span>
                <small>${agent.role}</small>
              </button>
            `
          })
          .join("")}
      </div>

      <article class="agent-detail">
        <div class="detail-topline">
          <span>${selectedAgent.group}</span>
          <button class="icon-button" type="button" data-copy-agent="${selectedAgent.id}" aria-label="Copiar prompt">
            ${state.copiedAgentId === selectedAgent.id ? "Copiado" : "Copiar prompt"}
          </button>
        </div>
        <h3>${selectedAgent.name}</h3>
        <p>${selectedAgent.mission}</p>
        <div class="detail-columns">
          <div>
            <h4>Entradas</h4>
            <ul>${selectedAgent.inputs.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          <div>
            <h4>Saídas</h4>
            <ul>${selectedAgent.outputs.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
        </div>
        <div class="gate-box">
          <span>Gate</span>
          <p>${selectedAgent.gate}</p>
        </div>
        <pre class="prompt-box"><code>${selectedAgent.prompt}</code></pre>
      </article>
    </section>
  `
}
