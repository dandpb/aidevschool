import type { AppState } from "../state"
import { currentAttrs } from "./activeAttrs"
import { escapeHtml } from "./escape"
import { viewRegistry } from "./registry"

export function renderNav(state: AppState): string {
  return viewRegistry
    .map(({ id, label }) => {
      const { className, aria } = currentAttrs(state.view === id, "page")
      return `<button class="nav-button ${className}" type="button" data-view="${escapeHtml(id)}"${aria}>${escapeHtml(label)}</button>`
    })
    .join("")
}
