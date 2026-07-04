import type { AppState } from "../state"
import { viewRegistry } from "./registry"

export function renderNav(state: AppState): string {
  return viewRegistry
    .map(({ id, label }) => {
      const isActive = state.view === id
      const activeClass = isActive ? "is-active" : ""
      const ariaCurrent = isActive ? 'aria-current="page"' : ""
      return `<button class="nav-button ${activeClass}" type="button" data-view="${id}" ${ariaCurrent}>${label}</button>`
    })
    .join("")
}
