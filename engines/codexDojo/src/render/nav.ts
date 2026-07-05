import type { AppState } from "../state"
import { viewRegistry } from "./registry"

export function renderNav(state: AppState): string {
  return viewRegistry
    .map(({ id, label }) => {
      const activeClass = state.view === id ? "is-active" : ""
      const ariaCurrent = state.view === id ? ' aria-current="page"' : ""
      return `<button class="nav-button ${activeClass}" type="button" data-view="${id}"${ariaCurrent}>${label}</button>`
    })
    .join("")
}
