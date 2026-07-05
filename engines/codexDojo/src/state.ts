import { advanceCycle } from "./cycle"
import { assertNever, type ProjectPhase, type View } from "./domain"

export type ProjectFilter = ProjectPhase | "all"

export type AppState = {
  readonly view: View
  readonly selectedAgentId: string
  readonly selectedStageId: string
  readonly selectedProjectId: string
  readonly completedStageIds: readonly string[]
  /**
   * Roadmap-only filter (phase selector). It is consumed solely by the roadmap view,
   * but it lives in the global AppState/reducer on purpose: keeping it here preserves
   * a single, unidirectional state source for the whole dashboard and avoids introducing
   * a second, view-local state channel that would have to be kept in sync with the reducer.
   */
  readonly projectFilter: ProjectFilter
  readonly copiedAgentId: string | null
}

export type AppAction =
  | { readonly kind: "changeView"; readonly view: View }
  | { readonly kind: "selectAgent"; readonly agentId: string }
  | { readonly kind: "selectStage"; readonly stageId: string }
  | { readonly kind: "selectProject"; readonly projectId: string }
  | { readonly kind: "advanceStage" }
  | { readonly kind: "setProjectFilter"; readonly filter: ProjectFilter }
  | { readonly kind: "markCopied"; readonly agentId: string | null }

export function buildInitialState(
  firstAgentId: string,
  firstStageId: string,
  firstProjectId = "p01",
): AppState {
  return {
    view: "overview",
    selectedAgentId: firstAgentId,
    selectedStageId: firstStageId,
    selectedProjectId: firstProjectId,
    completedStageIds: ["diagnosticar", "escolher"],
    projectFilter: "all",
    copiedAgentId: null,
  }
}

export function reduceState(state: AppState, action: AppAction): AppState {
  switch (action.kind) {
    case "changeView":
      if (state.view === action.view && state.copiedAgentId === null) return state
      return { ...state, view: action.view, copiedAgentId: null }
    case "selectAgent":
      if (
        state.selectedAgentId === action.agentId &&
        state.view === "agents" &&
        state.copiedAgentId === null
      )
        return state
      return { ...state, selectedAgentId: action.agentId, view: "agents", copiedAgentId: null }
    case "selectStage":
      if (state.selectedStageId === action.stageId && state.view === "cycle") return state
      return { ...state, selectedStageId: action.stageId, view: "cycle" }
    case "selectProject":
      if (state.selectedProjectId === action.projectId && state.view === "project") return state
      return { ...state, selectedProjectId: action.projectId, view: "project" }
    case "advanceStage": {
      const nextCycle = advanceCycle(state)
      if (
        nextCycle.selectedStageId === state.selectedStageId &&
        nextCycle.completedStageIds === state.completedStageIds &&
        state.view === "cycle"
      )
        return state
      return { ...state, ...nextCycle, view: "cycle" }
    }
    case "setProjectFilter":
      if (state.projectFilter === action.filter && state.view === "roadmap") return state
      return { ...state, projectFilter: action.filter, view: "roadmap" }
    case "markCopied":
      if (state.copiedAgentId === action.agentId) return state
      return { ...state, copiedAgentId: action.agentId }
    default:
      return assertNever(action)
  }
}
