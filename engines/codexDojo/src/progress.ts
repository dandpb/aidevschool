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

// Pre-compute stable groups once so render-time queries avoid scans and allocations.
const mutableProjectsByPhase = new Map<DojoProject["phase"], DojoProject[]>()
const noProjects: readonly DojoProject[] = Object.freeze([])

for (const project of projects) {
  const phaseProjects = mutableProjectsByPhase.get(project.phase)
  if (phaseProjects === undefined) {
    mutableProjectsByPhase.set(project.phase, [project])
  } else {
    phaseProjects.push(project)
  }
}

const projectsByPhase = new Map<DojoProject["phase"], readonly DojoProject[]>(
  [...mutableProjectsByPhase].map(([phase, phaseProjects]) => [
    phase,
    Object.freeze(phaseProjects),
  ]),
)

export function getProjects(filter: ProjectFilter = "all"): readonly DojoProject[] {
  if (filter === "all") {
    return projects
  }

  return projectsByPhase.get(filter) ?? noProjects
}

export function getCurrentProject(): DojoProject {
  // Level-0 (p00) is a parallel non-technical entry; default current is first technical project.
  const project = projects.find((p) => p.level >= 1) ?? projects[0]

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

// ⚡ Bolt: Pre-compute maps for O(1) lookups instead of O(n) array scans during renders
const agentsById = new Map<string, Agent>()
for (const agent of agents) {
  agentsById.set(agent.id, agent)
}

const stagesById = new Map<string, CycleStage>()
for (const stage of cycleStages) {
  stagesById.set(stage.id, stage)
}

const projectsById = new Map<string, DojoProject>()
for (const project of projects) {
  projectsById.set(project.id, project)
}

export function findAgent(agentId: string): Agent {
  const agent = agentsById.get(agentId)

  if (agent === undefined) {
    throw new Error(`Unknown agent: ${agentId}`)
  }

  return agent
}

export function findStage(stageId: string): CycleStage {
  const stage = stagesById.get(stageId)

  if (stage === undefined) {
    throw new Error(`Unknown stage: ${stageId}`)
  }

  return stage
}

export function findProject(projectId: string): DojoProject {
  const project = projectsById.get(projectId)

  if (project === undefined) {
    throw new Error(`Unknown project: ${projectId}`)
  }

  return project
}
