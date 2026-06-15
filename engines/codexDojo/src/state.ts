import { advanceCycle } from "./cycle"
import { assertNever, type ProjectPhase, type View } from "./domain"
import { getAgents, getStages } from "./progress"

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

const firstAgent = getAgents()[0]
const firstStage = getStages()[0]

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
      return { ...state, ...advanceCycle(state), view: "cycle" }
    case "setProjectFilter":
      return { ...state, projectFilter: action.filter, view: "roadmap" }
    case "markCopied":
      return { ...state, copiedAgentId: action.agentId }
    default:
      return assertNever(action)
  }
}
