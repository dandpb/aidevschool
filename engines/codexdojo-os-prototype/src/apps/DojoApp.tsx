import {
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Folder,
  FolderCode,
  Gauge,
  Network,
  Play,
  ShieldCheck,
  SquareTerminal,
  Star,
  Trophy,
} from 'lucide-react'
import type { CoreAppId, LearnerSnapshot, LearningContext } from '../domain'

const learnerStateLabels: Readonly<Record<LearnerSnapshot['activeUnit']['state'], string>> = {
  presenting: 'APRESENTANDO',
  practicing: 'PRATICANDO',
  evaluating: 'AVALIANDO',
  mastered: 'DOMINADA',
}

export function DojoApp({ learner, onTeach, onOpenApp }: { readonly learner: LearnerSnapshot; readonly onTeach: (context: LearningContext) => void; readonly onOpenApp: (id: CoreAppId) => void }) {
  const units = [
    { title: 'Pensar como um computador', subtitle: 'Dados, instruções e estado', state: 'done', icon: <Check /> },
    { title: 'Converse com o sistema', subtitle: 'Shell, comandos e processos', state: 'current', icon: <SquareTerminal /> },
    { title: 'Organize o conhecimento', subtitle: 'Arquivos, árvores e persistência', state: 'next', icon: <Folder /> },
    { title: 'Conecte as partes', subtitle: 'Redes, protocolos e eventos', state: 'locked', icon: <Network /> },
    { title: 'Construa com segurança', subtitle: 'Permissões, confiança e testes', state: 'locked', icon: <ShieldCheck /> },
  ]
  return (
    <div className="dojo-app">
      <aside className="app-sidebar">
        <div className="brand-lockup"><span><Code2 /></span><strong>codexDojo</strong></div>
        <nav>
          <button type="button" className="selected"><BookOpen /> Aprender</button>
          <button type="button"><Trophy /> Desafios</button>
          <button type="button"><FolderCode /> Projetos</button>
          <button type="button"><Gauge /> Progresso</button>
        </nav>
        <div className="sidebar-goal">
          <div><span>Meta diária</span><strong>2 de 3</strong></div>
          <div className="progress"><i style={{ width: '66%' }} /></div>
          <small>Mais uma missão para manter sua sequência.</small>
        </div>
      </aside>
      <section className="dojo-main">
        <header className="dojo-heading">
          <div>
            <span className="section-label">TRILHA 01 · FUNDAMENTOS</span>
            <h1>Domine o sistema por dentro.</h1>
            <p>Aprenda computação usando o próprio ambiente que você está estudando.</p>
            <div className="canonical-unit">
              <small>UNIDADE CANÔNICA · {learnerStateLabels[learner.activeUnit.state]}</small>
              <strong>{learner.activeUnit.title}</strong>
              <span>{learner.activeUnit.project} · retry {learner.activeUnit.retryCount}/{learner.activeUnit.retryLimit}</span>
            </div>
          </div>
          <div className="level-badge"><Award /><span>Nível 4<strong>Explorador</strong></span></div>
        </header>
        <div className="path-layout">
          <div className="learning-path">
            {units.map((unit, index) => (
              <button type="button"
                key={unit.title}
                className={`path-node ${unit.state}`}
                disabled={unit.state === 'locked'}
                onClick={() => {
                  onTeach({
                    eyebrow: `Unidade ${String(index + 1).padStart(2, '0')}`,
                    title: unit.title,
                    summary: `${unit.subtitle}. A unidade conecta explicação, observação do sistema e uma prática verificável.`,
                    concepts: [
                      { name: index === 1 ? 'Processo' : 'Modelo mental', detail: 'Uma representação simples que ajuda a prever o comportamento do sistema.' },
                      { name: 'Evidência', detail: 'Uma saída, teste ou explicação que comprova a aprendizagem.' },
                    ],
                    challenge: index === 1 ? 'Abra o Terminal e execute “learn process”.' : 'Explique o conceito com suas palavras e aplique-o em um app.',
                  })
                  if (index === 1) onOpenApp('terminal')
                }}
              >
                <span className="node-orb">{unit.icon}</span>
                <span className="node-copy"><small>{unit.state === 'done' ? 'CONCLUÍDO' : unit.state === 'current' ? 'AGORA' : unit.state === 'locked' ? 'BLOQUEADO' : 'A SEGUIR'}</small><strong>{unit.title}</strong><em>{unit.subtitle}</em></span>
                {unit.state !== 'locked' && <ChevronRight />}
              </button>
            ))}
          </div>
          <aside className="mission-card">
            <span className="mission-icon"><SquareTerminal /></span>
            <small>MISSÃO ATUAL · 8 MIN</small>
            <h2>Crie e observe um processo</h2>
            <p>Use o terminal, execute um comando e investigue o que o sistema precisou fazer.</p>
            <div className="mission-reward"><Star /> +40 XP <span>•</span> 1 conceito</div>
            <button type="button" className="primary-action" onClick={() => onOpenApp('terminal')}><Play /> Começar missão</button>
          </aside>
        </div>
      </section>
    </div>
  )
}
