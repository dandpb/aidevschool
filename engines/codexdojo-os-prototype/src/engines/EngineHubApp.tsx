import {
  BrainCircuit,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  Gamepad2,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Map as MapIcon,
  ServerCog,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { createEngineActionClient } from './client'
import { EmbeddedEngine } from './EmbeddedEngine'
import { type EngineActionRunner, LocalEngineAction } from './LocalEngineAction'
import { StaticEngineEvaluation } from './StaticEngineEvaluation'
import type { EngineAction, EngineDefinition, EngineId } from './protocol'
import { isOperatorSurface } from '../surface/operatorSurface'
import { visibleEngineRegistry } from '../apps/studentCatalog'
import { VoxelEngine } from './VoxelEngine'
import { parseVoxelUrlMap, type VoxelUrlMap } from './voxelCatalog'

export type { EngineActionRunner } from './LocalEngineAction'

export type EngineHubAppProps = {
  readonly configuredUrls?: Readonly<Partial<Record<EngineId, string>>>
  readonly development?: boolean
  readonly localBridgeAvailable?: boolean
  readonly runAction?: EngineActionRunner
  readonly configuredVoxelUrls?: VoxelUrlMap
  readonly operatorSurface?: boolean
}

const engineIcons: Readonly<Record<EngineId, ReactNode>> = {
  codexDojo: <LayoutDashboard />,
  minimaxDojo: <BrainCircuit />,
  miniMaxEvolutionEngine: <Gauge />,
  openclaw: <ListChecks />,
  pixelDojo: <Gamepad2 />,
  literacyDojo: <BookOpenCheck />,
  miniTown: <MapIcon />,
  dojoToday: <CalendarDays />,
  voxelDojo: <Boxes />,
  aiDevschoolMvp: <BookOpenCheck />,
  zaiDuolingoLike: <BookOpenCheck />,
}

const actionLabels: Readonly<Record<EngineAction, string>> = {
  'prepare-tutor-session': 'Preparar sessão de tutoria',
  'prepare-workflow': 'Preparar workflow',
  'preview-checklist': 'Pré-visualizar checklist',
}

const defaultUrls: Readonly<Partial<Record<EngineId, string>>> = {
  codexDojo: import.meta.env.VITE_CODEXDOJO_URL,
  pixelDojo: import.meta.env.VITE_PIXELDOJO_URL,
  literacyDojo: import.meta.env.VITE_LITERACYDOJO_URL,
  miniTown: import.meta.env.VITE_MINITOWN_URL,
  dojoToday: import.meta.env.VITE_DOJOTODAY_URL,
  voxelDojo: import.meta.env.VITE_VOXELDOJO_URL,
  zaiDuolingoLike: import.meta.env.VITE_ZAI_DUOLINGO_URL,
}

function publicEngineAccessLabel(engine: EngineDefinition): string {
  if (engine.id === 'dojoToday') return 'Sugestão neste dispositivo · somente leitura'
  if (engine.learnerAccess === 'read-only') return 'Estado canônico · somente leitura'
  return 'Evidência bruta · não verificada'
}

const defaultActionRunner = createEngineActionClient()
const defaultVoxelUrls = parseVoxelUrlMap(import.meta.env.VITE_VOXELDOJO_URLS)

export function EngineHubApp({
  configuredUrls = defaultUrls,
  development = import.meta.env.DEV,
  localBridgeAvailable = development || import.meta.env.VITE_LOCAL_ENGINE_BRIDGE === 'true',
  runAction = defaultActionRunner,
  configuredVoxelUrls = defaultVoxelUrls,
  operatorSurface = isOperatorSurface(),
}: EngineHubAppProps) {
  const engines = visibleEngineRegistry(operatorSurface)
  const [selectedId, setSelectedId] = useState<EngineId | null>(null)
  const [focusedEngine, setFocusedEngine] = useState(false)
  const selected = engines.find((engine) => engine.id === selectedId)

  const selectEngine = (engineId: EngineId) => {
    setSelectedId(engineId)
    setFocusedEngine(false)
  }

  return (
    <div className={focusedEngine ? 'engine-hub-app focused-engine' : 'engine-hub-app'}>
      <header className="engine-hub-header">
        <div className="engine-host-mark"><ServerCog /></div>
        <div>
          <span className="section-label">HOST DA EXPERIÊNCIA</span>
          <h1>codexDojo OS</h1>
          <p>Um desktop para operar cada motor sem duplicar aprendiz, currículo ou autoridade.</p>
        </div>
        <span className="engine-boundary">Host da experiência</span>
      </header>

      <div className="engine-hub-layout">
        <nav className="engine-selector" aria-label="Motores do ecossistema">
          {engines.map((engine) => (
            <button
              type="button"
              key={engine.id}
              aria-label={`Usar ${engine.name}`}
              aria-pressed={selectedId === engine.id}
              className={selectedId === engine.id ? 'selected' : ''}
              onClick={() => selectEngine(engine.id)}
            >
              <span className="engine-selector-icon">{engineIcons[engine.id]}</span>
              <span><strong>{engine.name}</strong><small>{engine.role}</small></span>
              <em>Usar {engine.name}</em>
            </button>
          ))}
        </nav>

        <section className="engine-workspace" aria-label="Área do motor selecionado">
          {selected === undefined ? (
            <div className="engine-overview">
              <Boxes />
              <span className="section-label">LABORATÓRIO DE ENGINES</span>
              <h2>Escolha um motor para começar.</h2>
              <p>Compare cada motor dentro do seu papel declarado. Saúde técnica não decide relevância pedagógica.</p>
            </div>
          ) : (
            <>
              <header className="engine-detail-header">
                <span className="engine-detail-icon">{engineIcons[selected.id]}</span>
                <div><span>{selected.role}</span><h2>{selected.name}</h2><p>{selected.capability}</p></div>
              </header>
              <div className="engine-policy-strip">
                <span>{publicEngineAccessLabel(selected)}</span>
                <strong>Domínio: nunca decidido pelo OS</strong>
              </div>
              <div className="engine-policy-strip" data-testid="engine-evaluation-boundary">
                <span>Classe: {selected.journeyClass}</span>
                <strong>Portfólio: {selected.portfolioStatus}</strong>
              </div>
              <section className="engine-guide" aria-label={`Guia de avaliação · ${selected.name}`}>
                <div>
                  <strong>Objetivo</strong>
                  <p>{selected.objective}</p>
                </div>
                <div>
                  <strong>Como acessar separadamente</strong>
                  <code>{selected.startCommand}</code>
                </div>
                <div>
                  <strong>O que avaliar</strong>
                  <p>{selected.evaluationFocus}</p>
                </div>
              </section>
              {selected.id === 'miniMaxEvolutionEngine' || selected.id === 'openclaw' ? (
                <div className="pipeline-integrity-warning" role="note">
                  <strong>Fonte única de pipeline</strong>
                  <span>learner/pipeline_status.yaml</span>
                  <span>Evolution e OpenClaw leem o mesmo estado canônico.</span>
                </div>
              ) : null}
              {selected.id === 'voxelDojo' ? (
                <VoxelEngine
                  configuredUrls={configuredVoxelUrls}
                  compatibilityUrl={configuredUrls.voxelDojo}
                  development={development}
                  focused={focusedEngine}
                  onToggleFocus={() => setFocusedEngine((current) => !current)}
                />
              ) : selected.runtime.kind === 'embedded-web' ? (
                <EmbeddedEngine
                  key={selected.id}
                  engineName={selected.name}
                  configuredUrl={selected.id === 'dojoToday'
                    ? withHostLocalQuery(configuredUrls[selected.id])
                    : configuredUrls[selected.id]}
                  developmentUrl={selected.runtime.developmentUrl}
                  development={development}
                  focused={focusedEngine}
                  onToggleFocus={() => setFocusedEngine((current) => !current)}
                  evidenceSource={selected.runtime.evidenceSource}
                />
              ) : selected.runtime.kind === 'static-evaluation' && localBridgeAvailable && selected.runtime.action !== null ? (
                <LocalEngineAction
                  key={selected.id}
                  engineId={selected.id}
                  action={selected.runtime.action}
                  label={actionLabels[selected.runtime.action]}
                  runAction={runAction}
                />
              ) : selected.runtime.kind === 'static-evaluation' ? (
                <StaticEngineEvaluation key={selected.id} engineId={selected.id} />
              ) : (
                <div className="engine-unavailable" role="status">
                  <ServerCog />
                  <strong>A ponte local não está disponível</strong>
                  <p>Use o servidor local de desenvolvimento para executar esta ação fixa.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function withHostLocalQuery(url: string | undefined): string | undefined {
  if (url === undefined || url.trim() === '') return url
  try {
    const parsed = new URL(url, 'https://os.invalid')
    parsed.searchParams.set('host', 'os')
    if (url.startsWith('/')) return `${parsed.pathname}${parsed.search}${parsed.hash}`
    return parsed.toString()
  } catch {
    return url
  }
}
