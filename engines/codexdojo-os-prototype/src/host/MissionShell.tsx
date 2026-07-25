import { useEffect, useMemo, useRef, useState } from 'react'
import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionSessionController, MissionSessionSnapshot } from './MissionSessionController'

const INITIAL_SESSION: MissionSessionSnapshot = {
  phase: 'handshaking',
  stage: 'understand',
  progress: 0,
  evidence: 'not-submitted',
}

const STAGE_LABELS = { understand: 'Entender', respond: 'Responder', apply: 'Aplicar' } as const

export function MissionShell({
  mission,
  learner,
  onComplete,
  onReturn,
}: {
  readonly mission: MissionDefinition
  readonly learner: LearnerSnapshot
  readonly onComplete: (mission: MissionDefinition) => Promise<void>
  readonly onReturn: () => void
}) {
  const services = useServices()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const controllerRef = useRef<MissionSessionController | null>(null)
  const completionSaved = useRef(false)
  const [session, setSession] = useState(INITIAL_SESSION)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const frameUrl = useMemo(() => services.missions.runtimeUrl(mission), [mission, services])

  useEffect(() => {
    const frame = frameRef.current
    if (!frameLoaded || frame === null) return
    const controller = services.host.createSession({
      frame,
      frameUrl,
      mission,
      onState(snapshot) {
        setSession(snapshot)
        if (snapshot.phase === 'completed' && !completionSaved.current) {
          completionSaved.current = true
          void onComplete(mission)
        }
      },
      onEvidence(record) {
        void services.verification.accept(record)
      },
    })
    controllerRef.current = controller
    controller.start()
    return () => {
      controller.close()
      controllerRef.current = null
    }
  }, [frameLoaded, frameUrl, mission, onComplete, services])

  return (
    <main className="journey-page mission-page">
      <header className="mission-header">
        <button type="button" className="journey-back" onClick={onReturn}>← Hub</button>
        <div>
          <p className="journey-eyebrow">IA Prática · {mission.estimatedMinutes} min</p>
          <h1>{mission.title}</h1>
          <p>{mission.objective}</p>
        </div>
        <div className="mission-canonical">
          <span>Estado canônico</span>
          <strong>{learner.activeUnit.state}</strong>
          <small>{learner.masteredCount} verificadas · sem alteração local</small>
        </div>
      </header>

      <section className="mission-status" aria-live="polite">
        <div><span>Etapa</span><strong>{STAGE_LABELS[session.stage]}</strong></div>
        <div><span>Motor</span><strong>{session.phase === 'handshaking' ? 'Conectando' : session.phase}</strong></div>
        <div><span>Evidência</span><strong>{session.evidence === 'pending' ? 'Verificação pendente' : 'Ainda não enviada'}</strong></div>
      </section>

      {session.error === undefined ? null : <p className="mission-error" role="alert">{session.error}</p>}
      <section className="mission-runtime" aria-label="Atividade da missão">
        <iframe
          ref={frameRef}
          src={frameUrl}
          title={`Missão ${mission.title}`}
          sandbox="allow-forms allow-scripts allow-same-origin"
          onLoad={() => setFrameLoaded(true)}
        />
      </section>
      <footer className="mission-footer">
        <p>{mission.fallback.summary}</p>
        {session.phase === 'completed' ? (
          <button type="button" className="journey-primary" onClick={onReturn}>Voltar ao hub</button>
        ) : null}
      </footer>
    </main>
  )
}
