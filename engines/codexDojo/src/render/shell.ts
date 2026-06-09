import type { View } from "../domain"
import { assertNever } from "../domain"
import type { AppState } from "../state"
import { renderAgents } from "./agents"
import { renderCycle } from "./cycle"
import { renderNav } from "./nav"
import { renderOverview } from "./overview"
import { renderProject } from "./project"
import { renderRoadmap } from "./roadmap"

export function renderShell(state: AppState): string {
  return `
    <main class="app-shell">
      <aside class="sidebar" aria-label="Navegação principal">
        <div class="brand-block">
          <span class="brand-mark">CD</span>
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

function renderView(state: AppState): string {
  const view: View = state.view

  switch (view) {
    case "overview":
      return renderOverview(state)
    case "agents":
      return renderAgents(state)
    case "cycle":
      return renderCycle(state)
    case "roadmap":
      return renderRoadmap(state)
    case "project":
      return renderProject()
    default:
      return assertNever(view)
  }
}
