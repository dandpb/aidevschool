import type { AppState } from "../state"
import { renderNav } from "./nav"
import { renderView } from "./registry"

export function renderShell(state: AppState): string {
  return `
    <main class="app-shell">
      <aside class="sidebar" aria-label="Navegação principal">
        <div class="brand-block">
          <span class="brand-mark" aria-hidden="true">CD</span>
          <div>
            <strong>codexDojo</strong>
            <small>agent learning lab</small>
          </div>
        </div>
        <nav class="nav-stack">${renderNav(state)}</nav>
      </aside>
      <div class="content-shell">
        ${renderView(state)}
      </div>
    </main>
  `
}
