import { getAgents, getSelectedAgent, getUserFacingAgents } from "../progress"
import type { AppState } from "../state"
import { pressedAttrs } from "./activeAttrs"
import { escapeHtml } from "./escape"

export function renderAgents(state: AppState): string {
  const selectedAgent = getSelectedAgent(state)
  const userFacingAgents = getUserFacingAgents()
  const coreAgents = getAgents()

  return `
    <section class="workbench agents-view" aria-label="Agentes do codexDojo">
      <div class="section-heading">
        <p class="eyebrow">Equipe multiagente</p>
        <h2>Responsabilidades claras, saídas verificáveis</h2>
        <p>
          A superfície de produto expõe 10 agentes para o aprendiz. O tutor core expande essa
          frente em 14 sub-agentes especializados para execução longa, memória e verificação adversarial.
        </p>
      </div>

      <article class="surface-map" aria-label="Camadas de agentes">
        <div class="surface-summary">
          <div><span>Produto</span><strong>${userFacingAgents.length}</strong><small>agentes user-facing</small></div>
          <div><span>Tutor core</span><strong>${coreAgents.length}</strong><small>sub-agentes especializados</small></div>
        </div>
        <div class="user-agent-grid">
          ${userFacingAgents
            .map(
              (agent) => `
                <div class="user-agent-card">
                  <strong>${escapeHtml(agent.name)}</strong>
                  <p>${escapeHtml(agent.responsibility)}</p>
                  <small>Expande para: ${escapeHtml(agent.expandsTo.join(", "))}</small>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>

      <div class="section-heading core-heading">
        <p class="eyebrow">Tutor core</p>
        <h3>14 papéis operacionais</h3>
      </div>

      <div class="agent-list">
        ${coreAgents
          .map((agent) => {
            const { className, aria } = pressedAttrs(agent.id === selectedAgent.id)
            return `
              <button class="agent-row ${className}" type="button" data-agent="${escapeHtml(agent.id)}"${aria}>
                <span>${escapeHtml(agent.name)}</span>
                <small>${escapeHtml(agent.role)}</small>
              </button>
            `
          })
          .join("")}
      </div>

      <article class="agent-detail">
        <div class="detail-topline">
          <span>${escapeHtml(selectedAgent.group)}</span>
          <button class="icon-button" type="button" data-copy-agent="${escapeHtml(selectedAgent.id)}" aria-live="polite">
            ${state.copiedAgentId === selectedAgent.id ? "Copiado" : "Copiar prompt"}
          </button>
        </div>
        <h3>${escapeHtml(selectedAgent.name)}</h3>
        <p>${escapeHtml(selectedAgent.mission)}</p>
        <div class="detail-columns">
          <div>
            <h4>Entradas</h4>
            <ul>${selectedAgent.inputs.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div>
            <h4>Saídas</h4>
            <ul>${selectedAgent.outputs.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
        </div>
        <div class="gate-box">
          <span>Gate</span>
          <p>${escapeHtml(selectedAgent.gate)}</p>
        </div>
        <pre class="prompt-box"><code>${escapeHtml(selectedAgent.prompt)}</code></pre>
      </article>
    </section>
  `
}
