export type EngineId =
  | 'codexDojo'
  | 'minimaxDojo'
  | 'miniMaxEvolutionEngine'
  | 'openclaw'
  | 'pixelDojo'
  | 'literacyDojo'
  | 'miniTown'
  | 'dojoToday'
  | 'voxelDojo'
  | 'aiDevschoolMvp'
  | 'zaiDuolingoLike'

export type EngineAction = 'prepare-tutor-session' | 'prepare-workflow' | 'preview-checklist'

export type EngineRuntime =
  | {
      readonly kind: 'embedded-web'
      readonly environmentKey: string
      readonly developmentUrl: string
      readonly evidenceSource: 'pixelquest' | null
      readonly missionProtocol: '1.0' | null
    }
  | {
      readonly kind: 'local-bridge'
      readonly action: EngineAction
      readonly sideEffect: 'read-only'
    }
  | {
      readonly kind: 'static-evaluation'
      readonly action: EngineAction | null
      readonly sideEffect: 'read-only'
    }

export type EngineDefinition = {
  readonly id: EngineId
  readonly name: string
  readonly role: string
  readonly capability: string
  readonly objective: string
  readonly startCommand: string
  readonly evaluationFocus: string
  readonly journeyClass: 'micro-lesson' | 'teaching-game' | 'explore-only' | 'operations'
  readonly portfolioStatus: 'learner-facing' | 'supporting' | 'internal' | 'incubating'
  readonly learnerAccess: 'read-only' | 'evidence-producer'
  readonly masteryAuthority: 'never'
  readonly runtime: EngineRuntime
}

export type EngineUrlState =
  | { readonly kind: 'ready'; readonly url: string }
  | { readonly kind: 'unavailable'; readonly reason: string }

export type EngineActionResult = {
  readonly ok: boolean
  readonly summary: string
  readonly output: string
}
