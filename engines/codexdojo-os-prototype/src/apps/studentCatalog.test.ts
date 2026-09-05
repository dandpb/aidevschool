import { describe, expect, it } from 'vitest'
import {
  PUBLIC_ENGINE_IDS,
  visibleAppCatalog,
  visibleDockAppIds,
  visibleEngineRegistry,
  visibleShortcutAppIds,
} from './studentCatalog'

describe('student desktop catalog', () => {
  it('shows Engine Hub plus the public 4-engine allowlist, hiding labs and Central de Apps', () => {
    const apps = visibleAppCatalog(false)
    const names = apps.map((app) => app.name)

    expect(names).toContain('Engine Hub')
    expect(names).not.toContain('Central de Apps')
    expect(names).not.toContain('Fundamentos')
    expect(names).toContain('Trilhas Dojo')
    expect(names).toContain('Terminal')

    expect(visibleDockAppIds(false)).toContain('engines')
    expect(visibleDockAppIds(false)).not.toContain('software')
    expect(visibleShortcutAppIds(false)).toContain('engines')

    const engineIds = visibleEngineRegistry(false).map((engine) => engine.id)
    expect(engineIds.sort()).toEqual([...PUBLIC_ENGINE_IDS].sort())
    expect(engineIds).not.toContain('miniTown')
    expect(engineIds).not.toContain('codexDojo')
    expect(engineIds).not.toContain('minimaxDojo')
  })

  it('keeps the full operator catalog when requested', () => {
    expect(visibleAppCatalog(true)).toHaveLength(11)
    expect(visibleEngineRegistry(true).map((engine) => engine.id)).toContain('miniTown')
    expect(visibleEngineRegistry(true).map((engine) => engine.id)).toContain('openclaw')
    expect(visibleDockAppIds(true)).toContain('engines')
    expect(visibleDockAppIds(true)).toContain('software')
  })
})
