import {
  Activity,
  Bot,
  Box,
  BrainCircuit,
  Check,
  ChevronRight,
  Cpu,
  GitBranch,
  GraduationCap,
  LayoutGrid,
} from 'lucide-react'
import { useState } from 'react'
import type { LearningContext } from '../domain'
import { coreContexts } from '../learning/learningContexts'
import { iconFor } from './AppIcon'
import { appCatalog } from './appCatalog'

export function ArchitectureApp({ onTeach }: { readonly onTeach: (context: LearningContext) => void }) {
  const layers = [
    { name: 'Experiência', detail: 'Desktop, janelas, navegação e acessibilidade', icon: <LayoutGrid />, color: 'coral' },
    { name: 'App SDK', detail: 'Manifesto, permissões, armazenamento e eventos', icon: <Box />, color: 'violet' },
    { name: 'Motor pedagógico', detail: 'Trilhas, domínio, XP, missões e evidências', icon: <GraduationCap />, color: 'blue' },
    { name: 'Mentor IA', detail: 'Contexto, ferramentas, segurança e avaliações', icon: <Bot />, color: 'cyan' },
    { name: 'Runtime', detail: 'Processos simulados, filesystem e event bus', icon: <Cpu />, color: 'slate' },
  ]
  return (
    <div className="architecture-app">
      <header>
        <span className="section-label">ARQUITETURA EVOLUTIVA</span>
        <h1>Um desktop; três contratos principais.</h1>
        <p>Apps publicam ações. A plataforma executa. O motor pedagógico transforma eventos em aprendizagem.</p>
      </header>
      <div className="architecture-flow">
        {layers.map((layer, index) => (
          <button type="button" key={layer.name} onClick={() => onTeach({
            eyebrow: `Camada ${index + 1}`,
            title: layer.name,
            summary: layer.detail,
            concepts: [
              { name: 'Contrato', detail: 'Define entradas, saídas e garantias sem expor detalhes internos.' },
              { name: 'Responsabilidade', detail: 'Cada camada tem um motivo principal para mudar.' },
            ],
            challenge: `Defina um evento que a camada “${layer.name}” deve produzir ou consumir.`,
          })}>
            <span className={`layer-icon ${layer.color}`}>{layer.icon}</span>
            <span><small>0{index + 1}</small><strong>{layer.name}</strong><em>{layer.detail}</em></span>
            <ChevronRight />
          </button>
        ))}
      </div>
      <div className="contract-strip">
        <div><GitBranch /><span><strong>AppManifest</strong><small>identidade + capacidades</small></span></div>
        <div><Activity /><span><strong>LearningEvent</strong><small>ação + conceito + evidência</small></span></div>
        <div><BrainCircuit /><span><strong>MentorContext</strong><small>estado + objetivo + limites</small></span></div>
      </div>
    </div>
  )
}

export function SoftwareApp({ onTeach }: { readonly onTeach: (context: LearningContext) => void }) {
  const [installed, setInstalled] = useState<string[]>(['Monitor do Sistema'])
  const apps = appCatalog.filter((app) => app.status === 'laboratorio').slice(0, 7)
  return (
    <div className="software-app">
      <header>
        <div><span className="section-label">PRÓXIMOS LABORATÓRIOS</span><h1>Expanda o ambiente.</h1></div>
        <div className="catalog-count"><strong>{appCatalog.length}</strong><span>apps mapeados</span></div>
      </header>
      <div className="software-list">
        {apps.map((app) => {
          const isInstalled = installed.includes(app.name)
          return (
            <div key={app.name} className="software-row">
              <span className="software-icon">{iconFor(app, 22)}</span>
              <span className="software-copy"><strong>{app.name}</strong><small>{app.concepts.join(' · ')}</small></span>
              <span className="lab-tag">LAB</span>
              <button type="button" className={isInstalled ? 'installed' : ''} onClick={() => {
                setInstalled((current) => isInstalled ? current.filter((item) => item !== app.name) : [...current, app.name])
                onTeach(coreContexts.software)
              }}>{isInstalled ? <><Check /> Instalado</> : 'Instalar'}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
