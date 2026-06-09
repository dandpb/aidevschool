export const views = ["overview", "agents", "cycle", "roadmap", "project"] as const
export type View = (typeof views)[number]

export const agentGroups = ["strategy", "build", "quality", "memory", "ops"] as const
export type AgentGroup = (typeof agentGroups)[number]

export const projectPhases = ["fundamentos", "apps", "dados", "escala", "ia"] as const
export type ProjectPhase = (typeof projectPhases)[number]

export type Agent = {
  readonly id: string
  readonly name: string
  readonly group: AgentGroup
  readonly role: string
  readonly mission: string
  readonly inputs: readonly string[]
  readonly outputs: readonly string[]
  readonly gate: string
  readonly prompt: string
}

export type CycleStage = {
  readonly id: string
  readonly label: string
  readonly owner: string
  readonly evidence: string
  readonly output: string
}

export type DojoProject = {
  readonly id: string
  readonly title: string
  readonly phase: ProjectPhase
  readonly level: number
  readonly language: string
  readonly architecture: string
  readonly learningGoal: string
  readonly evidence: readonly string[]
}

export type Metric = {
  readonly id: string
  readonly label: string
  readonly target: string
  readonly signal: string
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`)
}
