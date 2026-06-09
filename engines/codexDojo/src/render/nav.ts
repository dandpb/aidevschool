import { type View, views } from "../domain"
import type { AppState } from "../state"

const viewLabels: Readonly<Record<View, string>> = {
  overview: "Painel",
  agents: "Agentes",
  cycle: "Ciclo",
  roadmap: "Roadmap",
  project: "Projeto 01",
}

export function renderNav(state: AppState): string {
  return views
    .map((view) => {
      const activeClass = state.view === view ? "is-active" : ""
      return `<button class="nav-button ${activeClass}" type="button" data-view="${view}">${viewLabels[view]}</button>`
    })
    .join("")
}
