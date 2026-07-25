import { agents } from "../data/agents"
import { cycleStages, metrics } from "../data/cycle"
import { ecosystemStatuses } from "../data/ecosystem"
import type { Agent, CycleStage, DojoProject, EcosystemStatus, Metric } from "../domain"
import { normalizeDashboardStats } from "../normalize"
import { type DashboardStats, getCurrentProject, getDashboardStats } from "../progress"
import type { AppState } from "../state"

const OVERVIEW_AGENT_LIMIT = 14
const OVERVIEW_STAGE_LIMIT = 6

export type OverviewModel = {
  readonly stats: DashboardStats
  readonly visibleAgents: readonly Agent[]
  readonly currentProject: DojoProject
  readonly metrics: readonly Metric[]
  readonly ecosystemStatuses: readonly EcosystemStatus[]
  readonly visibleStages: readonly CycleStage[]
}

export function buildOverviewModel(state: AppState): OverviewModel {
  return {
    stats: normalizeDashboardStats(getDashboardStats(state)),
    visibleAgents: agents.slice(0, OVERVIEW_AGENT_LIMIT),
    currentProject: getCurrentProject(),
    metrics,
    ecosystemStatuses,
    visibleStages: cycleStages.slice(0, OVERVIEW_STAGE_LIMIT),
  }
}
