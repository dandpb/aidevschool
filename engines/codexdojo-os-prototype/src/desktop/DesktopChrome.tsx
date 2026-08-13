import {
  AppWindow,
  Boxes,
  BrainCircuit,
  Flame,
  FolderCode,
  FolderOpen,
  GraduationCap,
  Layers3,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PackageCheck,
  SquareTerminal,
  X,
  Zap,
} from 'lucide-react'
import { type CSSProperties, type PointerEvent, type ReactNode, useRef } from 'react'
import type { CoreAppId, LearnerSnapshot, WindowState } from '../domain'

export function TopBar({ learner, learnMode, onToggleLearn, onOpenLauncher }: { readonly learner: LearnerSnapshot; readonly learnMode: boolean; readonly onToggleLearn: () => void; readonly onOpenLauncher: () => void }) {
  const now = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date())
  return (
    <header className="topbar">
      <button type="button" className="topbar-action" onClick={onOpenLauncher}><LayoutGrid size={15} /> Atividades</button>
      <div className="topbar-center"><span>codexDojo OS</span><i /> <span>{now}</span></div>
      <div className="topbar-stats">
        <span><Flame size={15} /> {learner.streak.current} dias</span>
        <span><Zap size={15} /> {learner.masteredCount} dominadas · {learner.scaffoldedCount} preparadas</span>
        <button type="button" className={learnMode ? 'learn-toggle active' : 'learn-toggle'} onClick={onToggleLearn}><BrainCircuit size={15} /> Modo Aprender</button>
      </div>
    </header>
  )
}

export function DesktopShortcuts({ onOpen }: { readonly onOpen: (id: CoreAppId) => void }) {
  const shortcuts: readonly { readonly id: CoreAppId; readonly label: string; readonly icon: ReactNode }[] = [
    { id: 'dojo', label: 'Continuar trilha', icon: <GraduationCap /> },
    { id: 'terminal', label: 'Terminal', icon: <SquareTerminal /> },
    { id: 'files', label: 'Projetos', icon: <FolderCode /> },
    { id: 'engines', label: 'Engine Hub', icon: <Boxes /> },
  ]
  return (
    <aside className="desktop-shortcuts" aria-label="Atalhos">
      {shortcuts.map((shortcut) => (
        <button type="button" key={shortcut.id} onDoubleClick={() => onOpen(shortcut.id)} onClick={() => onOpen(shortcut.id)}>
          <span>{shortcut.icon}</span>
          <em>{shortcut.label}</em>
        </button>
      ))}
    </aside>
  )
}

export function Dock({ windows, onOpen, onLauncher }: { readonly windows: readonly WindowState[]; readonly onOpen: (id: CoreAppId) => void; readonly onLauncher: () => void }) {
  const entries: readonly { readonly id: CoreAppId; readonly label: string; readonly icon: ReactNode }[] = [
    { id: 'dojo', label: 'Trilhas Dojo', icon: <GraduationCap /> },
    { id: 'files', label: 'Arquivos', icon: <FolderOpen /> },
    { id: 'terminal', label: 'Terminal', icon: <SquareTerminal /> },
    { id: 'architecture', label: 'Arquitetura', icon: <Layers3 /> },
    { id: 'software', label: 'Apps', icon: <PackageCheck /> },
    { id: 'engines', label: 'Engine Hub', icon: <Boxes /> },
  ]
  return (
    <nav className="dock" aria-label="Aplicativos favoritos">
      {entries.map((entry) => (
        <button type="button" key={entry.id} className={windows.some((window) => window.id === entry.id) ? 'running' : ''} onClick={() => onOpen(entry.id)} title={entry.label}>
          {entry.icon}
          <span>{entry.label}</span>
        </button>
      ))}
      <div className="dock-separator" />
      <button type="button" onClick={onLauncher} title="Todos os aplicativos"><LayoutGrid /><span>Todos os apps</span></button>
    </nav>
  )
}

export function DesktopWindow({ window, children, onFocus, onClose, onMinimize, onMaximize, onMove }: {
  readonly window: WindowState
  readonly children: ReactNode
  readonly onFocus: () => void
  readonly onClose: () => void
  readonly onMinimize: () => void
  readonly onMaximize: () => void
  readonly onMove: (x: number, y: number) => void
}) {
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (window.maximized || (event.target as HTMLElement).closest('button')) return
    drag.current = { startX: event.clientX, startY: event.clientY, originX: window.x, originY: window.y }
    event.currentTarget.setPointerCapture(event.pointerId)
    onFocus()
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const x = Math.max(76, drag.current.originX + event.clientX - drag.current.startX)
    const y = Math.max(42, drag.current.originY + event.clientY - drag.current.startY)
    onMove(x, y)
  }
  const onPointerUp = () => { drag.current = null }

  const style: CSSProperties & Record<`--window-${string}`, string> = {
    '--window-left': `${window.x}px`,
    '--window-top': `${window.y}px`,
    '--window-width': `${window.width}px`,
    '--window-height': `${window.height}px`,
    zIndex: window.z,
  }

  return (
    <article className={window.maximized ? 'desktop-window maximized' : 'desktop-window'} style={style} onPointerDown={onFocus}>
      <div className="window-titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div className="window-title"><span className="app-mark"><AppWindow size={15} /></span>{window.title}</div>
        <div className="window-controls">
          <button type="button" onClick={onMinimize} aria-label="Minimizar"><Minimize2 /></button>
          <button type="button" onClick={onMaximize} aria-label="Maximizar"><Maximize2 /></button>
          <button type="button" className="close" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
      </div>
      <div className="window-content">{children}</div>
    </article>
  )
}
