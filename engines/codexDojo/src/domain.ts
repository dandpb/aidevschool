export const views = ["overview", "linuxLab", "agents", "cycle", "roadmap", "project"] as const
export type View = (typeof views)[number]

export const agentGroups = ["leader", "pedagogia", "qualidade", "memoria", "governanca"] as const
export type AgentGroup = (typeof agentGroups)[number]

export const projectPhases = [
  "aplicacao_ia",
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

/**
 * Learner snapshot, derived from `learner/learning_state.yaml` + `learner/learner_profile.md`
 * + `learner/pitfalls.md` + `learner/journal.md` by `learner/substrate/dashboard_snapshot.py`.
 * Re-run the script after any learner-state change; the dashboard is read-only here.
 */
export type LearnerSnapshot = {
  readonly activeUnit: {
    readonly id: string
    readonly title: string
    readonly project: string
    readonly state: "presenting" | "practicing" | "evaluating" | "mastered"
    readonly retryCount: number
    readonly retryLimit: number
  }
  readonly gate: {
    readonly implementationBlocked: boolean
    readonly unblockCondition: string
  }
  readonly profile: {
    readonly dreyfus: "novice" | "advanced_beginner" | "competent" | "proficient" | "expert"
    readonly bloom: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"
    readonly activeLanguage: string
    readonly weeklyTimeHours: number
  }
  readonly aidi: {
    readonly current: number
    readonly thresholdAmber: number
    readonly thresholdRed: number
    readonly measurementSource: "self_reported" | "event_computed" | "derived"
    readonly trend: ReadonlyArray<{
      readonly date: string
      readonly value: number
      readonly measurementSource: "self_reported" | "event_computed" | "derived"
    }>
  }
  readonly topPitfalls: ReadonlyArray<{
    readonly id: string
    readonly description: string
    readonly occurrences: number
    readonly lastSeen: string
  }>
  readonly nextReviews: ReadonlyArray<{
    readonly unitId: string
    readonly title: string
    readonly dueIn: string
    readonly reason: "overdue" | "due" | "interleaving" | "recurring-trap"
  }>
  readonly masteredCount: number
  readonly scaffoldedCount: number
  readonly streak: {
    readonly current: number
    readonly longest: number
    readonly lastGateDate: string | null
    readonly freezesEquipped: number
    readonly freezesMax: number
  }
  readonly curr: number
  readonly challenges: ReadonlyArray<{
    readonly id: string
    readonly phase: string
    readonly passed: boolean
    readonly attemptPresent: boolean
  }>
  // Polyglot Arena per-metric prediction calibration (additive, optional). See ADR-004.
  readonly predictions?: {
    readonly count: number
    readonly byMetric: {
      readonly latency: { readonly correct: number; readonly total: number }
      readonly memory: { readonly correct: number; readonly total: number }
      readonly throughput: { readonly correct: number; readonly total: number }
    }
  }
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${String(value)}`)
}
