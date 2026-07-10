import { useRef, useState } from 'react'
import { AppContent } from './apps/AppContent'
import { appTitles } from './apps/appCatalog'
import { learnerSnapshot } from './data/learner'
import {
  DesktopShortcuts,
  DesktopWindow,
  Dock,
  TopBar,
} from './desktop/DesktopChrome'
import type {
  AppDefinition,
  CoreAppId,
  LearnerSnapshot,
  LearningContext,
  WindowState,
} from './domain'
import { Launcher } from './launcher/Launcher'
import { coreContexts } from './learning/learningContexts'
import { LearningRail } from './learning/LearningRail'

type AppProps = {
  readonly learner?: LearnerSnapshot
}

export function App({ learner = learnerSnapshot }: AppProps) {
  const [windows, setWindows] = useState<WindowState[]>([
    {
      id: 'dojo',
      title: appTitles.dojo,
      x: 132,
      y: 78,
      width: 820,
      height: 580,
      z: 2,
      minimized: false,
      maximized: false,
    },
  ])
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [launcherQuery, setLauncherQuery] = useState('')
  const [learnMode, setLearnMode] = useState(true)
  const [learningContext, setLearningContext] = useState<LearningContext>(coreContexts.dojo)
  const [toast, setToast] = useState<string | null>(null)
  const maxZ = useRef(3)

  const teach = (context: LearningContext) => {
    setLearningContext(context)
    setLearnMode(true)
  }

  const focusWindow = (id: CoreAppId) => {
    maxZ.current += 1
    const nextZ = maxZ.current
    setWindows((current) =>
      current.map((window) =>
        window.id === id ? { ...window, z: nextZ, minimized: false } : window,
      ),
    )
  }

  const openApp = (id: CoreAppId) => {
    setLauncherOpen(false)
    teach(coreContexts[id])
    const existing = windows.find((window) => window.id === id)
    if (existing !== undefined) {
      focusWindow(id)
      return
    }

    const offset = windows.length * 24
    maxZ.current += 1
    const nextZ = maxZ.current
    setWindows((current) => [
      ...current,
      {
        id,
        title: appTitles[id],
        x: 110 + (offset % 180),
        y: 68 + (offset % 120),
        width: id === 'terminal' ? 760 : id === 'engines' ? 1040 : 840,
        height: id === 'terminal' ? 500 : id === 'engines' ? 650 : 570,
        z: nextZ,
        minimized: false,
        maximized: false,
      },
    ])
  }

  const closeWindow = (id: CoreAppId) => {
    setWindows((current) => current.filter((window) => window.id !== id))
  }

  const updateWindow = (id: CoreAppId, patch: Partial<WindowState>) => {
    setWindows((current) =>
      current.map((window) => (window.id === id ? { ...window, ...patch } : window)),
    )
  }

  const launchDefinition = (app: AppDefinition) => {
    if (app.appId !== undefined) {
      openApp(app.appId)
      return
    }

    const phase =
      app.status === 'laboratorio'
        ? 'está no próximo ciclo de prototipação'
        : 'está mapeado no roadmap'
    setToast(`${app.name} ${phase}.`)
    window.setTimeout(() => setToast(null), 2600)
    teach({
      eyebrow: 'Catálogo incremental',
      title: app.name,
      summary: `Este app ${phase}. O contrato pedagógico já conecta cada ação aos fundamentos que ela exercita.`,
      concepts: app.concepts.map((concept) => ({
        name: concept,
        detail: 'Conceito associado às missões, eventos e evidências deste aplicativo.',
      })),
      challenge: 'Descreva uma ação real deste app que provaria o domínio de um dos conceitos.',
    })
  }

  return (
    <main className="desktop-shell">
      <TopBar
        learner={learner}
        learnMode={learnMode}
        onToggleLearn={() => setLearnMode((value) => !value)}
        onOpenLauncher={() => setLauncherOpen(true)}
      />

      <DesktopShortcuts onOpen={openApp} />
      <Dock
        windows={windows}
        onOpen={openApp}
        onLauncher={() => setLauncherOpen((value) => !value)}
      />

      <section
        className={`window-space ${learnMode ? 'with-learning' : ''}`}
        aria-label="Área de trabalho"
      >
        {windows
          .filter((window) => !window.minimized)
          .map((window) => (
            <DesktopWindow
              key={window.id}
              window={window}
              onFocus={() => focusWindow(window.id)}
              onClose={() => closeWindow(window.id)}
              onMinimize={() => updateWindow(window.id, { minimized: true })}
              onMaximize={() => updateWindow(window.id, { maximized: !window.maximized })}
              onMove={(x, y) => updateWindow(window.id, { x, y })}
            >
              <AppContent
                appId={window.id}
                learner={learner}
                onTeach={teach}
                onOpenApp={openApp}
              />
            </DesktopWindow>
          ))}
      </section>

      {launcherOpen ? (
        <Launcher
          query={launcherQuery}
          onQuery={setLauncherQuery}
          onClose={() => setLauncherOpen(false)}
          onLaunch={launchDefinition}
        />
      ) : null}
      {learnMode ? <LearningRail context={learningContext} onClose={() => setLearnMode(false)} /> : null}
      {toast === null ? null : (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  )
}

export default App
