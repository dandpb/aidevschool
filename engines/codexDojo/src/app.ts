import { bindEvents } from "./render/events"
import { renderShell } from "./render/shell"
import { type AppAction, type AppState, initialState, reduceState } from "./state"

export class AppMountError extends Error {
  constructor(selector: string) {
    super(`Could not mount codexDojo. Missing element: ${selector}`)
    this.name = "AppMountError"
  }
}

export function mountCodexDojo(root: HTMLElement): void {
  let state: AppState = initialState

  const dispatch = (action: AppAction): void => {
    state = reduceState(state, action)
    render()
  }

  const render = (): void => {
    root.innerHTML = renderShell(state)
    bindEvents(root, dispatch)
  }

  render()
}
