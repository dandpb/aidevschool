import { getAgents, getProjects, getStages } from "./progress"
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
  const projects = getProjects()

  if (agents.length === 0 || stages.length === 0 || projects.length === 0) {
    throw new AppMountError("codexDojo needs at least one agent, one cycle stage, and one project.")
  }

  const firstAgent = agents[0]
  const firstStage = stages[0]
  const firstProject = projects[0]

  if (firstAgent === undefined || firstStage === undefined || firstProject === undefined) {
    throw new AppMountError("codexDojo needs at least one agent, one cycle stage, and one project.")
  }

  let state: AppState = buildInitialState(firstAgent.id, firstStage.id, firstProject.id)

  const dispatch = (action: AppAction): void => {
    state = reduceState(state, action)
    render()
  }

  const render = (): void => {
    root.innerHTML = renderShell(state)
  }

  bindEvents(root, dispatch)
  render()
}
