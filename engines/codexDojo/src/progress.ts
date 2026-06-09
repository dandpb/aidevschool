import { agents } from "./data/agents"
import { cycleStages } from "./data/cycle"
import { projects } from "./data/projects"
import type { Agent, CycleStage, DojoProject } from "./domain"
import type { AppState } from "./state"

export type DashboardStats = {
  readonly agents: number
  readonly stages: number
  readonly projects: number
  readonly completionPercent: number
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
    completionPercent: getCompletionPercent(state.completedStageIds),
  }
}

export function getCompletionPercent(completedStageIds: readonly string[]): number {
  if (cycleStages.length === 0) {
    return 0
  }

  const completed = cycleStages.filter((stage) => completedStageIds.includes(stage.id))
  return Math.round((completed.length / cycleStages.length) * 100)
}
