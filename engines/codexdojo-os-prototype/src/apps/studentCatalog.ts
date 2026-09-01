import type { CoreAppId } from '../domain'
import { appCatalog, type AppCatalogEntry } from './appCatalog'
import type { EngineDefinition } from '../engines/protocol'
import { engineRegistry } from '../engines/registry'
import { isOperatorSurface } from '../surface/operatorSurface'

const OPERATOR_ONLY_APP_IDS = new Set<CoreAppId>(['software'])
export const PUBLIC_ENGINE_IDS = ['voxelDojo', 'pixelDojo', 'dojoToday', 'literacyDojo'] as const

const STUDENT_DOCK_APP_IDS: readonly CoreAppId[] = ['dojo', 'files', 'terminal', 'architecture', 'engines']
const STUDENT_SHORTCUT_APP_IDS: readonly CoreAppId[] = ['dojo', 'terminal', 'files', 'engines']
const OPERATOR_DOCK_APP_IDS: readonly CoreAppId[] = [
  'dojo',
  'files',
  'terminal',
  'architecture',
  'software',
  'engines',
]
const OPERATOR_SHORTCUT_APP_IDS: readonly CoreAppId[] = ['dojo', 'terminal', 'files', 'engines']

export function visibleAppCatalog(operatorSurface = isOperatorSurface()): readonly AppCatalogEntry[] {
  if (operatorSurface) return appCatalog
  return appCatalog.filter(
    (app) => app.status !== 'laboratorio' && (app.appId === undefined || !OPERATOR_ONLY_APP_IDS.has(app.appId)),
  )
}

export function visibleEngineRegistry(operatorSurface = isOperatorSurface()): readonly EngineDefinition[] {
  if (operatorSurface) return engineRegistry
  const allow = new Set<string>(PUBLIC_ENGINE_IDS)
  return engineRegistry.filter((engine) => allow.has(engine.id))
}

export function visibleDockAppIds(operatorSurface = isOperatorSurface()): readonly CoreAppId[] {
  return operatorSurface ? OPERATOR_DOCK_APP_IDS : STUDENT_DOCK_APP_IDS
}

export function visibleShortcutAppIds(operatorSurface = isOperatorSurface()): readonly CoreAppId[] {
  return operatorSurface ? OPERATOR_SHORTCUT_APP_IDS : STUDENT_SHORTCUT_APP_IDS
}
