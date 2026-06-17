import { getAgents, getStages } from "./progress"
import { bindEvents } from "./render/events"
import { renderShell } from "./render/shell"
import { type AppAction, type AppState, buildInitialState, reduceState } from "./state"

export class AppMountError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AppMountError"
  }
}

export function mountCodexDojo(root: HTMLElement): void {
  const agents = getAgents()
  const stages = getStages()

  if (agents.length === 0 || stages.length === 0) {
    throw new AppMountError("codexDojo needs at least one agent and one cycle stage.")
  }

  const firstAgent = agents[0]
  const firstStage = stages[0]

  if (firstAgent === undefined || firstStage === undefined) {
    throw new AppMountError("codexDojo needs at least one agent and one cycle stage.")
  }

  let state: AppState = buildInitialState(firstAgent.id, firstStage.id)

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
