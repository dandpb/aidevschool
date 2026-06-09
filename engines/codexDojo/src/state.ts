import { agents } from "./data/agents"
import { cycleStages } from "./data/cycle"
import { projects } from "./data/projects"
import { assertNever, type ProjectPhase, type View } from "./domain"

export type ProjectFilter = ProjectPhase | "all"

export type AppState = {
  readonly view: View
  readonly selectedAgentId: string
  readonly selectedStageId: string
  readonly completedStageIds: readonly string[]
  readonly projectFilter: ProjectFilter
  readonly copiedAgentId: string | null
}

export type AppAction =
  | { readonly kind: "changeView"; readonly view: View }
  | { readonly kind: "selectAgent"; readonly agentId: string }
  | { readonly kind: "selectStage"; readonly stageId: string }
  | { readonly kind: "advanceStage" }
  | { readonly kind: "setProjectFilter"; readonly filter: ProjectFilter }
  | { readonly kind: "markCopied"; readonly agentId: string | null }

const firstAgent = agents[0]
const firstStage = cycleStages[0]

if (firstAgent === undefined || firstStage === undefined) {
  throw new Error("codexDojo needs at least one agent and one cycle stage.")
}

export const initialState: AppState = {
  view: "overview",
  selectedAgentId: firstAgent.id,
  selectedStageId: firstStage.id,
  completedStageIds: ["diagnosticar", "escolher"],
  projectFilter: "all",
  copiedAgentId: null,
}

export function reduceState(state: AppState, action: AppAction): AppState {
  switch (action.kind) {
    case "changeView":
      return { ...state, view: action.view, copiedAgentId: null }
    case "selectAgent":
      return { ...state, selectedAgentId: action.agentId, view: "agents", copiedAgentId: null }
    case "selectStage":
      return { ...state, selectedStageId: action.stageId, view: "cycle" }
    case "advanceStage":
      return advanceStage(state)
    case "setProjectFilter":
      return { ...state, projectFilter: action.filter, view: "roadmap" }
    case "markCopied":
      return { ...state, copiedAgentId: action.agentId }
    default:
      return assertNever(action)
  }
}

function advanceStage(state: AppState): AppState {
  const selectedIndex = cycleStages.findIndex((stage) => stage.id === state.selectedStageId)
  const nextIndex = selectedIndex >= 0 ? selectedIndex + 1 : 0
  const nextStage = cycleStages[nextIndex] ?? cycleStages[0]

  if (nextStage === undefined) {
    return state
  }

  const completed = state.completedStageIds.includes(state.selectedStageId)
    ? state.completedStageIds
    : [...state.completedStageIds, state.selectedStageId]

  return {
    ...state,
    selectedStageId: nextStage.id,
    completedStageIds: completed,
    view: "cycle",
  }
}

export function getFilteredProjects(filter: ProjectFilter): readonly (typeof projects)[number][] {
  if (filter === "all") {
    return projects
  }

  return projects.filter((project) => project.phase === filter)
}
