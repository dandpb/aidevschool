import { advanceCycle } from "./cycle"
import type { LinuxAppCategoryFilter } from "./data/linuxApps"
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
  readonly selectedLinuxAppId: string
  readonly linuxAppCategoryFilter: LinuxAppCategoryFilter
  readonly linuxLabRunCount: number
  readonly copiedAgentId: string | null
}

export type AppAction =
  | { readonly kind: "changeView"; readonly view: View }
  | { readonly kind: "selectAgent"; readonly agentId: string }
  | { readonly kind: "selectStage"; readonly stageId: string }
  | { readonly kind: "selectProject"; readonly projectId: string }
  | { readonly kind: "advanceStage" }
  | { readonly kind: "setProjectFilter"; readonly filter: ProjectFilter }
  | { readonly kind: "selectLinuxApp"; readonly appId: string }
  | { readonly kind: "setLinuxAppCategoryFilter"; readonly filter: LinuxAppCategoryFilter }
  | { readonly kind: "runLinuxLab" }
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
    selectedLinuxAppId: "terminal",
    linuxAppCategoryFilter: "all",
    linuxLabRunCount: 0,
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
    case "selectLinuxApp":
      // Performance optimization: return existing state if app selection hasn't changed
      // to preserve reference equality and avoid unnecessary DOM re-renders.
      if (state.selectedLinuxAppId === action.appId && state.view === "linuxLab") return state
      return { ...state, selectedLinuxAppId: action.appId, view: "linuxLab" }
    case "setLinuxAppCategoryFilter":
      // Performance optimization: return existing state if category filter hasn't changed
      // to preserve reference equality and avoid unnecessary DOM re-renders.
      if (state.linuxAppCategoryFilter === action.filter && state.view === "linuxLab") return state
      return { ...state, linuxAppCategoryFilter: action.filter, view: "linuxLab" }
    case "runLinuxLab":
      return { ...state, linuxLabRunCount: state.linuxLabRunCount + 1, view: "linuxLab" }
    case "markCopied":
      if (state.copiedAgentId === action.agentId) return state
      return { ...state, copiedAgentId: action.agentId }
    default:
      return assertNever(action)
  }
}
