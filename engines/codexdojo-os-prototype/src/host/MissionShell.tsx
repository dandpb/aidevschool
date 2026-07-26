import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionSessionSnapshot } from './MissionSessionController'
import type { EvidenceVerificationState } from '../verification/ports'

const INITIAL_SESSION: MissionSessionSnapshot = {
  phase: 'handshaking',
  stage: 'understand',
  progress: 0,
}

const STAGE_LABELS = { understand: 'Entender', respond: 'Responder', apply: 'Aplicar' } as const
type CompletionStatus = 'idle' | 'saving' | 'saved' | 'failed'

function verificationLabel(state: EvidenceVerificationState): string {
  switch (state.kind) {
    case 'not-submitted': return 'Ainda não enviada'
    case 'validating': return 'Validando evidência'
    case 'pending': return 'Aguardando verificador independente'
    case 'gateway-unavailable': return 'Verificador indisponível'
    case 'rejected': return 'Evidência rejeitada'
    case 'verified': return state.receipt.verdict === 'PASS' ? 'Verificação independente aprovada' : 'Verificação pede nova tentativa'
  }
}

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
  const saveInFlightRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const [session, setSession] = useState(INITIAL_SESSION)
  const [verification, setVerification] = useState<EvidenceVerificationState>({ kind: 'not-submitted' })
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('idle')
  const [loadedFrameUrl, setLoadedFrameUrl] = useState<string | null>(null)
  const frameUrl = useMemo(() => services.missions.runtimeUrl(mission), [mission, services])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const saveCompletion = useCallback(() => {
    if (saveInFlightRef.current) return
    saveInFlightRef.current = true
    setCompletionStatus('saving')
    void onCompleteRef.current(mission).then(
      () => setCompletionStatus('saved'),
      () => {
        saveInFlightRef.current = false
        setCompletionStatus('failed')
      },
    )
  }, [mission])

  useEffect(() => {
    const frame = frameRef.current
    if (loadedFrameUrl !== frameUrl || frame === null) return
    saveInFlightRef.current = false
    setCompletionStatus('idle')
    setSession(INITIAL_SESSION)
    setVerification({ kind: 'not-submitted' })
    const controller = services.host.createSession({
      frame,
      frameUrl,
      mission,
      onState(snapshot) {
        setSession(snapshot)
        if (snapshot.phase === 'completed') saveCompletion()
      },
      async onEvidence(submission) {
        const state = await services.verification.accept(mission, submission, setVerification)
        return state.kind === 'rejected'
          ? { accepted: false, code: state.code }
          : { accepted: true }
      },
    })
    controller.start()
    return () => controller.close()
  }, [frameUrl, loadedFrameUrl, mission, saveCompletion, services])

  const evidencePreserved =
    verification.kind !== 'not-submitted' && verification.kind !== 'validating'
  const canReturn =
    session.phase === 'completed' && completionStatus === 'saved' && evidencePreserved
  const returnBlocked = session.phase === 'completed' && !canReturn

  return (
    <main className="journey-page mission-page">
      <header className="mission-header">
        <button type="button" className="journey-back" disabled={returnBlocked} onClick={onReturn}>← Hub</button>
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
        <div><span>Evidência</span><strong>{verificationLabel(verification)}</strong></div>
      </section>

      {verification.kind === 'verified' ? (
        <section className="verification-note" aria-live="polite">
          <strong>Veredito independente: {verification.receipt.verdict}</strong>
          <p>Gate canônico não executado: este veredito não altera o estado canônico.</p>
        </section>
      ) : null}
      {verification.kind === 'gateway-unavailable' ? (
        <section className="verification-note" role="status">
          <p>A evidência foi preservada. O verificador local está indisponível.</p>
          <button type="button" onClick={() => void services.verification.retry(mission, setVerification)}>Tentar verificação novamente</button>
        </section>
      ) : null}
      {verification.kind === 'rejected' ? <p className="mission-error" role="alert">Evidência recusada: {verification.code}</p> : null}
      {completionStatus === 'failed' ? (
        <section className="verification-note" role="alert">
          <p>Não foi possível salvar a conclusão local.</p>
          <button type="button" onClick={saveCompletion}>Tentar salvar novamente</button>
        </section>
      ) : null}

      {session.error === undefined ? null : <p className="mission-error" role="alert">{session.error}</p>}
      <section className="mission-runtime" aria-label="Atividade da missão">
        <iframe
          ref={frameRef}
          src={frameUrl}
          title={`Missão ${mission.title}`}
          sandbox="allow-forms allow-scripts allow-same-origin"
          onLoad={() => setLoadedFrameUrl(frameUrl)}
        />
      </section>
      <footer className="mission-footer">
        <p>{mission.fallback.summary}</p>
        {session.phase === 'completed' ? (
          <button type="button" className="journey-primary" disabled={!canReturn} onClick={onReturn}>
            {completionStatus === 'saving'
              ? 'Salvando conclusão…'
              : evidencePreserved
                ? 'Voltar ao hub'
                : 'Preservando evidência…'}
          </button>
        ) : null}
      </footer>
    </main>
  )
}
