import { getCycleCompletionPercent } from "./cycle"
import { agents } from "./data/agents"
import { cycleStages, metrics } from "./data/cycle"
import { projects } from "./data/projects"
import type { Agent, CycleStage, DojoProject, Metric } from "./domain"
import type { AppState, ProjectFilter } from "./state"

export type DashboardStats = {
  readonly agents: number
  readonly stages: number
  readonly projects: number
  readonly completionPercent: number
}

export function getSelectedAgent(state: AppState): Agent {
  return findAgent(state.selectedAgentId)
}

export function getCurrentStage(state: AppState): CycleStage {
  return findStage(state.selectedStageId)
}

export function getAgents(): readonly Agent[] {
  return agents
}

export function getStages(): readonly CycleStage[] {
  return cycleStages
}

export function getMetrics(): readonly Metric[] {
  return metrics
}

export function getProjects(filter: ProjectFilter = "all"): readonly DojoProject[] {
  if (filter === "all") {
    return projects
  }

  return projects.filter((project) => project.phase === filter)
}

export function getCurrentProject(): DojoProject {
  const project = projects[0]

  if (project === undefined) {
    throw new Error("No codexDojo project configured.")
  }

  return project
}

export function getDashboardStats(state: AppState): DashboardStats {
  return {
    agents: agents.length,
    stages: cycleStages.length,
    projects: projects.length,
    completionPercent: getCycleCompletionPercent(state.completedStageIds),
  }
}

export function isStageCompleted(state: AppState, stageId: string): boolean {
  return state.completedStageIds.includes(stageId)
}

export function findAgent(agentId: string): Agent {
  const agent = agents.find((candidate) => candidate.id === agentId)

  if (agent === undefined) {
    throw new Error(`Unknown agent: ${agentId}`)
  }

  return agent
}

export function findStage(stageId: string): CycleStage {
  const stage = cycleStages.find((candidate) => candidate.id === stageId)

  if (stage === undefined) {
    throw new Error(`Unknown stage: ${stageId}`)
  }

  return stage
}
