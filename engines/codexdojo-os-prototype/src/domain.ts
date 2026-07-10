export type CoreAppId = 'dojo' | 'terminal' | 'files' | 'architecture' | 'software' | 'engines'
export type AppStatus = 'disponivel' | 'laboratorio' | 'planejado'

export type AppDefinition = {
  readonly name: string
  readonly category: string
  readonly concepts: readonly string[]
  readonly status: AppStatus
  readonly appId?: CoreAppId
}

export type LearningContext = {
  readonly eyebrow: string
  readonly title: string
  readonly summary: string
  readonly concepts: readonly { readonly name: string; readonly detail: string }[]
  readonly challenge: string
}

export type WindowState = {
  readonly id: CoreAppId
  readonly title: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly z: number
  readonly minimized: boolean
  readonly maximized: boolean
}

export type LearnerSnapshot = {
  readonly activeUnit: {
    readonly id: string
    readonly title: string
    readonly project: string
    readonly state: 'presenting' | 'practicing' | 'evaluating' | 'mastered'
    readonly retryCount: number
    readonly retryLimit: number
  }
  readonly gate: {
    readonly implementationBlocked: boolean
    readonly unblockCondition: string
  }
  readonly profile: {
    readonly dreyfus: 'novice' | 'advanced_beginner' | 'competent' | 'proficient' | 'expert'
    readonly bloom: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
    readonly activeLanguage: string
    readonly weeklyTimeHours: number
  }
  readonly aidi: {
    readonly current: number
    readonly thresholdAmber: number
    readonly thresholdRed: number
    readonly trend: readonly { readonly date: string; readonly value: number }[]
  }
  readonly topPitfalls: readonly {
    readonly id: string
    readonly description: string
    readonly occurrences: number
    readonly lastSeen: string
  }[]
  readonly nextReviews: readonly {
    readonly unitId: string
    readonly title: string
    readonly dueIn: string
    readonly reason: 'overdue' | 'due' | 'interleaving' | 'recurring-trap'
  }[]
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
  readonly predictions: {
    readonly count: number
    readonly byMetric: Readonly<
      Record<'latency' | 'memory' | 'throughput', { readonly correct: number; readonly total: number }>
    >
  }
}
