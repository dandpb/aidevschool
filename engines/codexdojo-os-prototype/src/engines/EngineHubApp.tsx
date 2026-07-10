import {
  BrainCircuit,
  Boxes,
  Gamepad2,
  Gauge,
  LayoutDashboard,
  ListChecks,
  ServerCog,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { createEngineActionClient } from './client'
import { EmbeddedEngine } from './EmbeddedEngine'
import { type EngineActionRunner, LocalEngineAction } from './LocalEngineAction'
import type { EngineId } from './protocol'
import { engineRegistry } from './registry'

export type { EngineActionRunner } from './LocalEngineAction'

export type EngineHubAppProps = {
  readonly configuredUrls?: Readonly<Partial<Record<EngineId, string>>>
  readonly development?: boolean
  readonly localBridgeAvailable?: boolean
  readonly runAction?: EngineActionRunner
}

const engineIcons: Readonly<Record<EngineId, ReactNode>> = {
  codexDojo: <LayoutDashboard />,
  minimaxDojo: <BrainCircuit />,
  miniMaxEvolutionEngine: <Gauge />,
  openclaw: <ListChecks />,
  pixelDojo: <Gamepad2 />,
  voxelDojo: <Boxes />,
}

const actionLabels: Readonly<Record<string, string>> = {
  'run-reference-contract': 'Executar contrato de referência',
  'validate-phase-runner': 'Validar PhaseRunner',
  'preview-checklist': 'Pré-visualizar checklist',
}

const defaultUrls: Readonly<Partial<Record<EngineId, string>>> = {
  codexDojo: import.meta.env.VITE_CODEXDOJO_URL,
  pixelDojo: import.meta.env.VITE_PIXELDOJO_URL,
  voxelDojo: import.meta.env.VITE_VOXELDOJO_URL,
}

const defaultActionRunner = createEngineActionClient()

export function EngineHubApp({
  configuredUrls = defaultUrls,
  development = import.meta.env.DEV,
  localBridgeAvailable = development,
  runAction = defaultActionRunner,
}: EngineHubAppProps) {
  const [selectedId, setSelectedId] = useState<EngineId | null>(null)
  const [focusedEngine, setFocusedEngine] = useState(false)
  const selected = engineRegistry.find((engine) => engine.id === selectedId)

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
          {engineRegistry.map((engine) => (
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
              <span className="section-label">SEIS MOTORES INTEGRADOS</span>
              <h2>Escolha um motor para começar.</h2>
              <p>Apps web abrem dentro desta janela. Motores locais usam apenas ações fixas e auditáveis.</p>
            </div>
          ) : (
            <>
              <header className="engine-detail-header">
                <span className="engine-detail-icon">{engineIcons[selected.id]}</span>
                <div><span>{selected.role}</span><h2>{selected.name}</h2><p>{selected.capability}</p></div>
              </header>
              <div className="engine-policy-strip">
                <span>{selected.learnerAccess === 'read-only' ? 'Estado canônico · somente leitura' : 'Evidência bruta · não verificada'}</span>
                <strong>Domínio: nunca decidido pelo OS</strong>
              </div>
              {selected.id === 'miniMaxEvolutionEngine' || selected.id === 'openclaw' ? (
                <div className="pipeline-integrity-warning" role="note">
                  <strong>Fontes de pipeline divergentes</strong>
                  <span>Evolution: learner/pipeline_status.md — Project 02</span>
                  <span>OpenClaw: learner/pipeline_status.yaml — Project 01</span>
                </div>
              ) : null}
              {selected.runtime.kind === 'embedded-web' ? (
                <EmbeddedEngine
                  key={selected.id}
                  engineName={selected.name}
                  configuredUrl={configuredUrls[selected.id]}
                  developmentUrl={selected.runtime.developmentUrl}
                  development={development}
                  focused={focusedEngine}
                  onToggleFocus={() => setFocusedEngine((current) => !current)}
                  evidenceSource={
                    selected.id === 'pixelDojo'
                      ? 'pixelquest'
                      : selected.id === 'voxelDojo'
                        ? 'voxeldojo'
                        : null
                  }
                />
              ) : localBridgeAvailable ? (
                <LocalEngineAction
                  key={selected.id}
                  engineId={selected.id}
                  action={selected.runtime.action}
                  label={actionLabels[selected.runtime.action] ?? 'Executar ação permitida'}
                  runAction={runAction}
                />
              ) : (
                <div className="engine-unavailable" role="status">
                  <ServerCog />
                  <strong>A ponte local não está disponível</strong>
                  <p>Use o servidor de desenvolvimento local para executar esta ação fixa.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
