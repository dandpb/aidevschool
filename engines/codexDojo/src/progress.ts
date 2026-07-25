import { getCycleCompletionPercent } from "./cycle"
import { agents } from "./data/agents"
import { cycleStages } from "./data/cycle"
import { projects } from "./data/projects"
import type { Agent, CycleStage, DojoProject } from "./domain"
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

// ⚡ Bolt: Pre-compute default current project at module initialization to avoid O(n) scan on every render
const defaultCurrentProject = (() => {
  const project = projects.find((p) => p.level >= 1) ?? projects[0]
  if (project === undefined) {
    throw new Error("No codexDojo project configured.")
  }
  return project
})()

export function getCurrentProject(): DojoProject {
  return defaultCurrentProject
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
