import type { CoreAppId } from '../domain'
import { appCatalog, type AppCatalogEntry } from './appCatalog'
import type { EngineDefinition } from '../engines/protocol'
import { engineRegistry } from '../engines/registry'
import { isOperatorSurface } from '../surface/operatorSurface'

const OPERATOR_ONLY_APP_IDS = new Set<CoreAppId>(['software', 'engines'])
const OPERATOR_ENGINE_IDS = new Set<EngineDefinition['id']>([
  'codexDojo',
  'minimaxDojo',
  'miniMaxEvolutionEngine',
  'openclaw',
])
// Engine-lab embeds (ec265fab line) are evaluation surfaces inside the Engine
// Hub only; they never join the desktop catalog for students or operators.
const LAB_ENGINE_IDS = new Set<EngineDefinition['id']>([
  'literacyDojo',
  'miniTown',
  'dojoToday',
  'aiDevschoolMvp',
  'zaiDuolingoLike',
])

const STUDENT_DOCK_APP_IDS: readonly CoreAppId[] = ['dojo', 'files', 'terminal', 'architecture']
const STUDENT_SHORTCUT_APP_IDS: readonly CoreAppId[] = ['dojo', 'terminal', 'files']
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
  if (operatorSurface) {
    return engineRegistry.filter((engine) => !LAB_ENGINE_IDS.has(engine.id))
  }
  return engineRegistry.filter((engine) => !OPERATOR_ENGINE_IDS.has(engine.id) && !LAB_ENGINE_IDS.has(engine.id))
}

export function visibleDockAppIds(operatorSurface = isOperatorSurface()): readonly CoreAppId[] {
  return operatorSurface ? OPERATOR_DOCK_APP_IDS : STUDENT_DOCK_APP_IDS
}

export function visibleShortcutAppIds(operatorSurface = isOperatorSurface()): readonly CoreAppId[] {
  return operatorSurface ? OPERATOR_SHORTCUT_APP_IDS : STUDENT_SHORTCUT_APP_IDS
}
