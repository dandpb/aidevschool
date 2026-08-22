import { describe, expect, it } from 'vitest'
import {
  visibleAppCatalog,
  visibleDockAppIds,
  visibleEngineRegistry,
  visibleShortcutAppIds,
} from './studentCatalog'

describe('student desktop catalog', () => {
  it('hides Engine Hub, Central de Apps, laboratorio apps, and operator engines', () => {
    const apps = visibleAppCatalog(false)
    const names = apps.map((app) => app.name)

    expect(names).not.toContain('Engine Hub')
    expect(names).not.toContain('Central de Apps')
    expect(names).not.toContain('Fundamentos')
    expect(names).toContain('Trilhas Dojo')
    expect(names).toContain('Terminal')

    expect(visibleDockAppIds(false)).not.toContain('engines')
    expect(visibleDockAppIds(false)).not.toContain('software')
    expect(visibleShortcutAppIds(false)).not.toContain('engines')

    const engineIds = visibleEngineRegistry(false).map((engine) => engine.id)
    expect(engineIds).toEqual(['pixelDojo', 'voxelDojo'])
  })

  it('keeps the full operator catalog when requested', () => {
    expect(visibleAppCatalog(true)).toHaveLength(11)
    expect(visibleEngineRegistry(true)).toHaveLength(6)
    expect(visibleDockAppIds(true)).toContain('engines')
  })
})
