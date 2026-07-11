import { getCycleCompletionPercent } from "./cycle"
import { agents, userFacingAgents } from "./data/agents"
import { cycleStages, metrics } from "./data/cycle"
import { ecosystemStatuses } from "./data/ecosystem"
import { learnerSnapshot } from "./data/learner"
import { projects } from "./data/projects"
import type {
  Agent,
  CycleStage,
  DojoProject,
  EcosystemStatus,
  LearnerSnapshot,
  Metric,
  UserFacingAgent,
} from "./domain"
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

/**
 * Deliberate query seam: returns the canonical agent roster.
 *
 * Call sites read agents through this function rather than importing
 * `data/agents` directly, so the data source can move (static module, runtime
 * config, domain store) without scattering imports across renderers and stats
 * aggregators. Keep as a thin passthrough; do not add logic here.
 */
export function getAgents(): readonly Agent[] {
  return agents
}

export function getUserFacingAgents(): readonly UserFacingAgent[] {
  return userFacingAgents
}

/**
 * Deliberate query seam: returns the canonical cycle-stage definitions.
 *
 * Funneling access through this getter means the source of truth for stages
 * can move (static module, runtime config, persisted learner state) without
 * rewriting the views or stats aggregators that consume the list. Keep as a
 * thin passthrough; do not add logic here.
 */
export function getStages(): readonly CycleStage[] {
  return cycleStages
}

/**
 * Deliberate query seam: returns the canonical metric definitions.
 *
 * Metrics shape the dashboard's evaluation cards and feed the
 * `getDashboardStats` aggregator. Indirection through this getter lets the
 * metric catalogue evolve (additions, deprecations, tenant overrides)
 * without scattering imports of `data/cycle` across the renderer. Keep as a
 * thin passthrough; do not add logic here.
 */
export function getMetrics(): readonly Metric[] {
  return metrics
}

export function getEcosystemStatuses(): readonly EcosystemStatus[] {
  return ecosystemStatuses
}

/**
 * Deliberate query seam for the learner snapshot.
 *
 * Mirrors `getAgents`/`getMetrics` — keeps the source-of-truth location flexible
 * (a future change can swap the static module for a substrate-derived JSON load
 * without rewriting the renderer). Keep as a thin passthrough.
 */
export function getLearnerSnapshot(): LearnerSnapshot {
  return learnerSnapshot
}

// ⚡ Bolt Optimization: Pre-compute project groupings into O(1) map to avoid O(n) filter allocations during render loops
const projectsByPhase = projects.reduce((acc, project) => {
  const phase = project.phase
  if (!acc.has(phase)) {
    acc.set(phase, [])
  }
  acc.get(phase)?.push(project)
  return acc
}, new Map<string, DojoProject[]>())

export function getProjects(filter: ProjectFilter = "all"): readonly DojoProject[] {
  if (filter === "all") {
    return projects
  }

  return projectsByPhase.get(filter) ?? []
}

export function getCurrentProject(): DojoProject {
  const project = projects[0]

  if (project === undefined) {
    throw new Error("No codexDojo project configured.")
  }

  return project
}

export function getSelectedProject(state: AppState): DojoProject {
  return findProject(state.selectedProjectId)
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

export function findProject(projectId: string): DojoProject {
  const project = projects.find((candidate) => candidate.id === projectId)

  if (project === undefined) {
    throw new Error(`Unknown project: ${projectId}`)
  }

  return project
}
