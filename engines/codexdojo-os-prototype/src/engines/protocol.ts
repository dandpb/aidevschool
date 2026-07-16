export type EngineId =
  | 'codexDojo'
  | 'minimaxDojo'
  | 'miniMaxEvolutionEngine'
  | 'openclaw'
  | 'pixelDojo'
  | 'voxelDojo'

export type EngineAction = 'prepare-tutor-session' | 'prepare-workflow' | 'preview-checklist'

export type EngineRuntime =
  | {
      readonly kind: 'embedded-web'
      readonly environmentKey: string
      readonly developmentUrl: string
      readonly evidenceSource: 'pixelquest' | null
    }
  | {
      readonly kind: 'local-bridge'
      readonly action: EngineAction
      readonly sideEffect: 'read-only'
    }

export type EngineDefinition = {
  readonly id: EngineId
  readonly name: string
  readonly role: string
  readonly capability: string
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
