import { describe, expect, it } from 'vitest'
import { engineRegistry, resolveEngineUrl } from './registry'

const expectedEngineIds = [
  'codexDojo',
  'minimaxDojo',
  'miniMaxEvolutionEngine',
  'openclaw',
  'pixelDojo',
  'literacyDojo',
  'miniTown',
  'dojoToday',
  'voxelDojo',
  'aiDevschoolMvp',
  'zaiDuolingoLike',
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

  it('gives every catalog card a production-safe web evaluation mode', () => {
    // Given
    const byId = new Map(engineRegistry.map((engine) => [engine.id, engine]))

    // When
    const runtimeKinds = expectedEngineIds.map((id) => byId.get(id)?.runtime.kind)

    // Then
    expect(runtimeKinds).toEqual([
      'embedded-web',
      'static-evaluation',
      'static-evaluation',
      'static-evaluation',
      'embedded-web',
      'embedded-web',
      'embedded-web',
      'embedded-web',
      'embedded-web',
      'static-evaluation',
      'embedded-web',
    ])
  })

  it('declares a production URL seam for every separately hosted surface', () => {
    const expectedEnvironmentKeys = {
      codexDojo: 'VITE_CODEXDOJO_URL',
      pixelDojo: 'VITE_PIXELDOJO_URL',
      literacyDojo: 'VITE_LITERACYDOJO_URL',
      miniTown: 'VITE_MINITOWN_URL',
      dojoToday: 'VITE_DOJOTODAY_URL',
      voxelDojo: 'VITE_VOXELDOJO_URL',
      zaiDuolingoLike: 'VITE_ZAI_DUOLINGO_URL',
    } as const

    for (const engine of engineRegistry.filter((candidate) => candidate.runtime.kind === 'embedded-web')) {
      expect(engine.runtime).toMatchObject({
        kind: 'embedded-web',
        environmentKey: expectedEnvironmentKeys[engine.id as keyof typeof expectedEnvironmentKeys],
      })
    }
  })

  it('keeps static evaluations read-only and explicit that they do not execute their source engine', () => {
    const staticEvaluations = engineRegistry.filter((engine) => engine.runtime.kind === 'static-evaluation')

    expect(staticEvaluations.map((engine) => engine.id)).toEqual([
      'minimaxDojo',
      'miniMaxEvolutionEngine',
      'openclaw',
      'aiDevschoolMvp',
    ])
    for (const engine of staticEvaluations) {
      expect(engine.learnerAccess).toBe('read-only')
      expect(engine.masteryAuthority).toBe('never')
    }
  })

  it('describes public dojoToday as a local suggestion, not canonical FSRS', () => {
    const dojoToday = engineRegistry.find((engine) => engine.id === 'dojoToday')
    expect(dojoToday?.role).toBe('Sugestão neste dispositivo')
    expect(dojoToday?.capability).toMatch(/progresso local/)
    expect(dojoToday?.capability).not.toMatch(/substrato/)
    expect(dojoToday?.objective).toMatch(/sugestão neste dispositivo/)
    expect(dojoToday?.objective).not.toMatch(/derivada do estado canônico/)
  })

  it('never grants an OS adapter mastery authority', () => {
    // Given
    const registry = engineRegistry

    // When
    const authorities = registry.map((engine) => engine.masteryAuthority)

    // Then
    expect(authorities).toEqual(expectedEngineIds.map(() => 'never'))
  })

  it('declares voxelDojo mission hosting without granting mastery authority', () => {
    const voxel = engineRegistry.find((engine) => engine.id === 'voxelDojo')

    expect(voxel?.runtime).toMatchObject({
      kind: 'embedded-web',
      missionProtocol: '1.0',
    })
    expect(voxel?.masteryAuthority).toBe('never')
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

  it('accepts staged /apps/* paths on the OS origin', () => {
    expect(resolveEngineUrl('/apps/pixelquest/', 'http://127.0.0.1:9999/', false, 'http://127.0.0.1:4174')).toEqual({
      kind: 'ready',
      url: '/apps/pixelquest/',
    })
    expect(resolveEngineUrl(
      'http://127.0.0.1:4174/apps/dojotoday/',
      'http://127.0.0.1:9999/',
      false,
      'http://127.0.0.1:4174',
    )).toEqual({
      kind: 'ready',
      url: 'http://127.0.0.1:4174/apps/dojotoday/',
    })
    expect(resolveEngineUrl('/apps/../secret/', 'http://127.0.0.1:9999/', false, 'http://127.0.0.1:4174').kind).toBe(
      'unavailable',
    )
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
