import { getCodexDojoOsUrl } from "../data/osEngine"
import { escapeHtml } from "../render/escape"
import type { AppState } from "../state"

/**
 * Linux Lab is only a launch bridge to the canonical OS experience.
 * ponytail: no fake desktop / app catalog — that lives in codexdojo-os-prototype.
 */
export function renderLinuxLab(_state: AppState): string {
  const osUrl = getCodexDojoOsUrl()
  const action = osUrl
    ? `<a class="action-button" data-codexdojo-os-launch="true" href="${escapeHtml(osUrl)}" target="_blank" rel="noreferrer">Abrir codexDojo OS</a>`
    : `<p role="status">Configure <code>VITE_CODEXDOJO_OS_URL</code> para habilitar o workspace completo.</p>`

  return `
    <section class="linux-lab" aria-labelledby="linux-lab-title">
      <div class="section-heading linux-lab-heading">
        <p class="eyebrow">codexDojo OS</p>
        <h1 id="linux-lab-title">Linux Lab</h1>
        <p class="lead">
          Full desktop learning workspace lives in the OS prototype. This dashboard only launches it.
        </p>
      </div>
      <aside class="os-engine-bridge" aria-label="codexDojo OS workspace">
        <div>
          <strong>Workspace completo</strong>
          <p>Continue no engine de desktop com o mesmo snapshot canônico do learner.</p>
        </div>
        ${action}
      </aside>
    </section>
  `
}
