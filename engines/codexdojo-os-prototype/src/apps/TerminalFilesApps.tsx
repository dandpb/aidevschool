import {
  BookOpen,
  ChevronRight,
  Code2,
  Folder,
  FolderCode,
  FolderOpen,
  GraduationCap,
  HardDrive,
  LockKeyhole,
  Menu,
  Search,
  Star,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import type { LearningContext } from '../domain'
import { coreContexts } from '../learning/learningContexts'

export function TerminalApp({ onTeach }: { readonly onTeach: (context: LearningContext) => void }) {
  const [lines, setLines] = useState<string[]>([
    'codexDojo Terminal 0.1 — ambiente seguro de aprendizagem',
    'Digite “help” para ver os comandos disponíveis.',
    '',
  ])
  const [command, setCommand] = useState('')

  const execute = (event: FormEvent) => {
    event.preventDefault()
    const normalized = command.trim().toLowerCase()
    const responses: Record<string, string[]> = {
      help: ['Comandos: help, ls, pwd, whoami, date, apps, learn process, clear'],
      ls: ['Projetos  Anotações  Desafios  README.md'],
      pwd: ['/home/daniel'],
      whoami: ['daniel — explorador nível 4'],
      date: [new Date().toLocaleString('pt-BR')],
      apps: ['dojo  files  terminal  architecture  software'],
      'learn process': ['MICROLIÇÃO: o shell interpretou seu texto.', '1. Procurou um comando compatível.', '2. Criou um processo com memória e estado.', '3. Aguardou a saída e devolveu o controle.', 'DESAFIO: por que “clear” não apaga arquivos?'],
    }
    if (normalized === 'clear') {
      setLines([])
    } else {
      setLines((current) => [...current, `$ ${command}`, ...(responses[normalized] ?? [`comando não encontrado: ${command}`])])
    }
    if (normalized) onTeach(coreContexts.terminal)
    setCommand('')
  }

  return (
    <div className="terminal-app">
      <div className="terminal-toolbar"><span><i /> sessão local</span><small>bash · modo seguro</small></div>
      <div className="terminal-output" aria-live="polite">
        {lines.map((line, index) => <div key={`${line}-${index}`} className={line.startsWith('MICROLIÇÃO') ? 'lesson-line' : ''}>{line || '\u00A0'}</div>)}
        <form onSubmit={execute}>
          <label htmlFor="command">daniel@dojo:~$</label>
          <input id="command" value={command} onChange={(event) => setCommand(event.target.value)} autoComplete="off" spellCheck={false} />
        </form>
      </div>
    </div>
  )
}

export function FilesApp({ onTeach }: { readonly onTeach: (context: LearningContext) => void }) {
  const [path, setPath] = useState('/home/daniel')
  const rootItems = [
    { name: 'Projetos', type: 'folder', meta: '4 itens', icon: <FolderCode /> },
    { name: 'Anotações', type: 'folder', meta: '12 itens', icon: <Folder /> },
    { name: 'Desafios', type: 'folder', meta: '3 itens', icon: <Folder /> },
    { name: 'README.md', type: 'file', meta: '2,4 KB', icon: <BookOpen /> },
  ]
  const projectItems = [
    { name: 'hello-process', type: 'folder', meta: 'missão atual', icon: <FolderCode /> },
    { name: 'file-tree', type: 'folder', meta: 'concluído', icon: <FolderCode /> },
    { name: 'network-ping', type: 'folder', meta: 'bloqueado', icon: <LockKeyhole /> },
    { name: 'learning.json', type: 'file', meta: '1,8 KB', icon: <Code2 /> },
  ]
  const items = path.endsWith('Projetos') ? projectItems : rootItems
  const openItem = (item: typeof rootItems[number]) => {
    if (item.type === 'folder') setPath((current) => current.endsWith('Projetos') ? `${current}/${item.name}` : `${current}/${item.name}`)
    onTeach(coreContexts.files)
  }
  return (
    <div className="files-app">
      <aside className="files-sidebar">
        <strong>Locais</strong>
        <button type="button" className="active"><FolderOpen /> Início</button>
        <button type="button"><Star /> Favoritos</button>
        <button type="button"><HardDrive /> Computador</button>
        <strong>Aprender</strong>
        <button type="button"><GraduationCap /> Meus projetos</button>
      </aside>
      <section className="files-main">
        <div className="files-toolbar">
          <button type="button" onClick={() => setPath('/home/daniel')} title="Voltar ao início"><ChevronRight className="back-icon" /></button>
          <div className="path-field">{path.split('/').filter(Boolean).map((part, index) => <span key={part}>{index > 0 && <ChevronRight />}{part}</span>)}</div>
          <button type="button" aria-label="Buscar arquivos"><Search /></button>
          <button type="button" aria-label="Menu de arquivos"><Menu /></button>
        </div>
        <div className="file-grid">
          {items.map((item) => (
            <button type="button" key={item.name} onDoubleClick={() => openItem(item)} onClick={() => onTeach(coreContexts.files)}>
              <span className={item.type === 'folder' ? 'file-icon folder' : 'file-icon'}>{item.icon}</span>
              <strong>{item.name}</strong>
              <small>{item.meta}</small>
            </button>
          ))}
        </div>
        <footer>{items.length} itens <span>•</span> Clique duas vezes para abrir uma pasta</footer>
      </section>
    </div>
  )
}
