import { advanceCycle } from "./cycle"
import { assertNever, type ProjectPhase, type View } from "./domain"

export type ProjectFilter = ProjectPhase | "all"

export type AppState = {
  readonly view: View
  readonly selectedAgentId: string
  readonly selectedStageId: string
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
  | { readonly kind: "advanceStage" }
  | { readonly kind: "setProjectFilter"; readonly filter: ProjectFilter }
  | { readonly kind: "markCopied"; readonly agentId: string | null }

export function buildInitialState(firstAgentId: string, firstStageId: string): AppState {
  return {
    view: "overview",
    selectedAgentId: firstAgentId,
    selectedStageId: firstStageId,
    completedStageIds: ["diagnosticar", "escolher"],
    projectFilter: "all",
    copiedAgentId: null,
  }
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
      return { ...state, ...advanceCycle(state), view: "cycle" }
    case "setProjectFilter":
      return { ...state, projectFilter: action.filter, view: "roadmap" }
    case "markCopied":
      return { ...state, copiedAgentId: action.agentId }
    default:
      return assertNever(action)
  }
}
