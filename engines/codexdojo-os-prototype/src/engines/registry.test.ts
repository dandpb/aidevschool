import { describe, expect, it } from 'vitest'
import { engineRegistry, resolveEngineUrl } from './registry'

const expectedEngineIds = [
  'codexDojo',
  'minimaxDojo',
  'miniMaxEvolutionEngine',
  'openclaw',
  'pixelDojo',
  'voxelDojo',
] as const

describe('codexDojo OS engine registry', () => {
  it('registers every external first-class engine exactly once', () => {
    // Given
    const ids = engineRegistry.map((engine) => engine.id)

    // When
    const uniqueIds = new Set(ids)

    // Then
    expect(ids).toEqual(expectedEngineIds)
    expect(uniqueIds.size).toBe(expectedEngineIds.length)
  })

  it('assigns real embedded runtimes to web engines and fixed read-only actions to local engines', () => {
    // Given
    const byId = new Map(engineRegistry.map((engine) => [engine.id, engine]))

    // When
    const webKinds = ['codexDojo', 'pixelDojo', 'voxelDojo'].map(
      (id) => byId.get(id as (typeof expectedEngineIds)[number])?.runtime.kind,
    )
    const localKinds = ['minimaxDojo', 'miniMaxEvolutionEngine', 'openclaw'].map(
      (id) => byId.get(id as (typeof expectedEngineIds)[number])?.runtime,
    )

    // Then
    expect(webKinds).toEqual(['embedded-web', 'embedded-web', 'embedded-web'])
    expect(localKinds).toEqual([
      { kind: 'local-bridge', action: 'run-reference-contract', sideEffect: 'read-only' },
      { kind: 'local-bridge', action: 'validate-phase-runner', sideEffect: 'read-only' },
      { kind: 'local-bridge', action: 'preview-checklist', sideEffect: 'read-only' },
    ])
  })

  it('never grants an OS adapter mastery authority', () => {
    // Given
    const registry = engineRegistry

    // When
    const authorities = registry.map((engine) => engine.masteryAuthority)

    // Then
    expect(authorities).toEqual(expectedEngineIds.map(() => 'never'))
  })
})

describe('embedded engine URL boundary', () => {
  it.each([
    ['https://dojo.example/app', 'https://dojo.example/app'],
    ['http://127.0.0.1:5173/', 'http://127.0.0.1:5173/'],
  ])('accepts a safe configured URL %s', (configured, expected) => {
    // Given
    const developmentFallback = 'http://127.0.0.1:9999/'

    // When
    const result = resolveEngineUrl(
      configured,
      developmentFallback,
      false,
      'http://127.0.0.1:4174',
    )

    // Then
    expect(result).toEqual({ kind: 'ready', url: expected })
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,unsafe',
    'file:///tmp/engine.html',
    'ftp://example.test/engine',
    '//example.test/engine',
    '/engines/pixel-quest/',
    'not a url',
  ])('rejects an unsafe or malformed configured URL %s', (configured) => {
    // Given
    const developmentFallback = 'http://127.0.0.1:9999/'

    // When
    const result = resolveEngineUrl(configured, developmentFallback, false)

    // Then
    expect(result.kind).toBe('unavailable')
  })

  it('rejects a same-origin runtime because scripts could escape the iframe sandbox', () => {
    const result = resolveEngineUrl(
      'http://127.0.0.1:4174/embedded-engine',
      'http://127.0.0.1:9999/',
      false,
      'http://127.0.0.1:4174',
    )

    expect(result).toEqual({
      kind: 'unavailable',
      reason: 'Engine runtime must use a separate origin from the OS.',
    })
  })

  it('uses a localhost fallback only in development', () => {
    // Given
    const fallback = 'http://127.0.0.1:5173/'

    // When
    const development = resolveEngineUrl(undefined, fallback, true)
    const production = resolveEngineUrl(undefined, fallback, false)

    // Then
    expect(development).toEqual({ kind: 'ready', url: fallback })
    expect(production).toEqual({
      kind: 'unavailable',
      reason: 'Engine runtime is not configured.',
    })
  })
})
