export const views = ["overview", "agents", "cycle", "roadmap", "project"] as const
export type View = (typeof views)[number]

export const agentGroups = ["leader", "pedagogia", "qualidade", "memoria", "governanca"] as const
export type AgentGroup = (typeof agentGroups)[number]

export const projectPhases = [
  "fundamentos",
  "concorrencia",
  "arquitetura",
  "escalabilidade",
  "resiliencia",
  "sistemas_complexos",
] as const
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

export type UserFacingAgent = {
  readonly id: string
  readonly name: string
  readonly responsibility: string
  readonly expandsTo: readonly string[]
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
  readonly functionalRequirements?: readonly string[]
  readonly nonFunctionalRequirements?: readonly string[]
  readonly extraDoneCriteria?: readonly string[]
}

export type Metric = {
  readonly id: string
  readonly label: string
  readonly target: string
  readonly signal: string
  readonly measurement?: string
  readonly evidencePath?: string
}

export type EcosystemStatus = {
  readonly id: string
  readonly label: string
  readonly state: string
  readonly evidence: string
  readonly nextStep: string
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`)
}
