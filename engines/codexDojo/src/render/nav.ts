import type { AppState } from "../state"
import { escapeHtml } from "./escape"
import { viewRegistry } from "./registry"

export function renderNav(state: AppState): string {
  return viewRegistry
    .map(({ id, label }) => {
      const activeClass = state.view === id ? "is-active" : ""
      return `<button class="nav-button ${activeClass}" type="button" data-view="${escapeHtml(id)}">${escapeHtml(label)}</button>`
    })
    .join("")
}
