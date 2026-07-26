import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emitAnalyticsSafely } from '../analytics/events'
import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionSessionController, MissionSessionSnapshot } from './MissionSessionController'
import type { EvidenceVerificationState } from '../verification/ports'
import { ResultScreen, type MissionCompletionSummary } from '../journey/ResultScreen'
import { MentorPanel } from '../mentor/MentorPanel'
import {
  createInitialRendererState,
  type RendererFailureReason,
  type RendererPreference,
} from '../rendering/domain'

const INITIAL_SESSION: MissionSessionSnapshot = {
  phase: 'handshaking',
  stage: 'understand',
  progress: 0,
  renderer: createInitialRendererState(),
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

const RENDERER_REASON_LABELS: Readonly<Record<RendererFailureReason, string>> = {
  unsupported: 'WebGL não está disponível neste dispositivo.',
  'creation-failed': 'A visualização 3D não pôde ser iniciada.',
  'context-lost': 'A conexão com a GPU foi interrompida.',
  'restore-failed': 'A visualização 3D não pôde ser restaurada.',
  'load-timeout': 'A visualização 3D demorou além do limite.',
}

function requestedRenderer(): RendererPreference {
  const value = new URLSearchParams(window.location.search).get('renderer')
  return value === 'webgl' || value === 'accessible' ? value : 'auto'
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function MissionShell({
  mission,
  learner,
  onComplete,
  onReturn,
}: {
  readonly mission: MissionDefinition
  readonly learner: LearnerSnapshot
  readonly onComplete: (
    mission: MissionDefinition,
    preferredNextMissionId?: string,
  ) => Promise<MissionCompletionSummary | undefined>
  readonly onReturn: () => void
}) {
  const services = useServices()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const controllerRef = useRef<MissionSessionController | null>(null)
  const rendererAnalyticsRef = useRef<string | null>(null)
  const saveInFlightRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const nextMissionIdRef = useRef<string | undefined>(undefined)
  const [session, setSession] = useState(INITIAL_SESSION)
  const [verification, setVerification] = useState<EvidenceVerificationState>({ kind: 'not-submitted' })
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus>('idle')
  const [completionSummary, setCompletionSummary] = useState<MissionCompletionSummary | undefined>()
  const [loadedFrameUrl, setLoadedFrameUrl] = useState<string | null>(null)
  const frameUrl = useMemo(() => services.missions.runtimeUrl(mission), [mission, services])
  const trackLabel = mission.trackId === 'dev' ? 'Trilha Dev' : 'IA Prática'
  const rendererPreference = useMemo(requestedRenderer, [])
  const reducedMotion = useMemo(prefersReducedMotion, [])

  const analyticsContext = useMemo(
    () => ({ trackId: mission.trackId, missionId: mission.id }),
    [mission.id, mission.trackId],
  )

  const updateVerification = useCallback(
    (state: EvidenceVerificationState) => {
      setVerification(state)
      if (state.kind === 'not-submitted') return
      emitAnalyticsSafely(services.analytics, {
        name: 'verification.state_changed',
        dimensions: {
          state: state.kind,
          ...(state.kind === 'verified' ? { verdict: state.receipt.verdict } : {}),
        },
        context: analyticsContext,
      })
    },
    [analyticsContext, services.analytics],
  )

  const retryVerification = useCallback(() => {
    emitAnalyticsSafely(services.analytics, {
      name: 'retry.requested',
      dimensions: { reason: 'verification-unavailable' },
      context: analyticsContext,
    })
    void services.verification.retry(mission, updateVerification)
  }, [analyticsContext, mission, services, updateVerification])

  const retryRenderer = useCallback((preference: RendererPreference) => {
    controllerRef.current?.retryRenderer(preference)
  }, [])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const saveCompletion = useCallback(() => {
    if (saveInFlightRef.current) return
    saveInFlightRef.current = true
    setCompletionStatus('saving')
    void onCompleteRef.current(mission, nextMissionIdRef.current).then(
      (summary) => {
        setCompletionSummary(summary)
        setCompletionStatus('saved')
      },
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
    setCompletionSummary(undefined)
    setSession(INITIAL_SESSION)
    setVerification({ kind: 'not-submitted' })
    const controller = services.host.createSession({
      frame,
      frameUrl,
      mission,
      rendererPreference,
      reducedMotion,
      onState(snapshot) {
        nextMissionIdRef.current = snapshot.nextMissionId
        setSession(snapshot)
        if (snapshot.phase === 'completed') saveCompletion()
      },
      async onEvidence(submission) {
        const state = await services.verification.accept(mission, submission, updateVerification)
        return state.kind === 'rejected'
          ? { accepted: false, code: state.code }
          : { accepted: true }
      },
      onMissionEvent(input) {
        emitAnalyticsSafely(services.analytics, {
          name: input.event.name,
          dimensions: input.event.dimensions,
          context: {
            ...analyticsContext,
            missionRunId: input.missionRunId,
            engineId: mission.runtime.engineId,
            engineVersion: input.engineVersion,
            contentVersion: input.contentVersion,
          },
        })
      },
    })
    controllerRef.current = controller
    controller.start()
    return () => {
      if (controllerRef.current === controller) controllerRef.current = null
      controller.close()
    }
  }, [analyticsContext, frameUrl, loadedFrameUrl, mission, reducedMotion, rendererPreference, saveCompletion, services, updateVerification])

  useEffect(() => {
    if (session.renderer.status !== 'degraded' || session.renderer.reason === undefined) return
    const key = `${session.renderer.reason}:${session.renderer.active}`
    if (rendererAnalyticsRef.current === key) return
    rendererAnalyticsRef.current = key
    emitAnalyticsSafely(services.analytics, {
      name: 'renderer.degraded',
      dimensions: { reason: session.renderer.reason, fallback: session.renderer.active },
      context: { ...analyticsContext, rendererMode: session.renderer.active },
    })
  }, [analyticsContext, services.analytics, session.renderer])

  const verificationFinished =
    verification.kind === 'verified'
    || verification.kind === 'rejected'
    || verification.kind === 'gateway-unavailable'
  const canReturn =
    session.phase === 'completed' && completionStatus === 'saved' && verificationFinished
  const returnBlocked = session.phase === 'completed' && !canReturn

  return (
    <main className="journey-page mission-page">
      <header className="mission-header">
        <button type="button" className="journey-back" disabled={returnBlocked} onClick={onReturn}>← Hub</button>
        <div>
          <p className="journey-eyebrow">{trackLabel} · {mission.estimatedMinutes} min</p>
          <h1>{mission.title}</h1>
          <p>{mission.objective}</p>
        </div>
        <div className="mission-canonical">
          <span>Estado canônico</span>
          <strong>{learner.activeUnit.state}</strong>
          <small>{learner.masteredCount} verificadas · sem alteração local</small>
        </div>
      </header>

      <section
        className={`mission-status${mission.runtime.engineId === 'voxelDojo' ? ' with-renderer' : ''}`}
        aria-live="polite"
      >
        <div><span>Etapa</span><strong>{STAGE_LABELS[session.stage]}</strong></div>
        <div><span>Motor</span><strong>{session.phase === 'handshaking' ? 'Conectando' : session.phase}</strong></div>
        {mission.runtime.engineId === 'voxelDojo' ? (
          <div>
            <span>Visualização</span>
            <strong>{session.renderer.active === 'webgl' ? '3D WebGL' : session.renderer.active === 'none' ? session.renderer.status : 'Acessível'}</strong>
          </div>
        ) : null}
        <div><span>Evidência</span><strong>{verificationLabel(verification)}</strong></div>
      </section>

      {mission.runtime.engineId === 'voxelDojo' &&
      (session.renderer.status === 'degraded' || session.renderer.status === 'failed') ? (
        <section className="renderer-recovery" role="status">
          <div>
            <strong>Missão preservada em modo acessível</strong>
            <p>
              {session.renderer.reason === undefined
                ? 'A simulação continua sem depender da visualização 3D.'
                : RENDERER_REASON_LABELS[session.renderer.reason]}
              {' '}As decisões, os critérios e a evidência não mudam.
            </p>
          </div>
          <button type="button" onClick={() => retryRenderer('webgl')}>Tentar 3D novamente</button>
        </section>
      ) : null}
      {mission.runtime.engineId === 'voxelDojo' && session.renderer.active === 'webgl' ? (
        <section className="renderer-choice">
          <p>{mission.fallback.summary}</p>
          <button type="button" onClick={() => retryRenderer('accessible')}>Usar visualização acessível</button>
        </section>
      ) : null}

      {session.phase !== 'completed' && verification.kind === 'verified' ? (
        <section className="verification-note" aria-live="polite">
          <strong>Veredito independente: {verification.receipt.verdict}</strong>
          <p>Gate canônico não executado: a tentativa e os requisitos do gate continuam separados deste veredito.</p>
        </section>
      ) : null}
      {session.phase !== 'completed' && verification.kind === 'gateway-unavailable' ? (
        <section className="verification-note" role="status">
          <p>A evidência foi preservada. O verificador local está indisponível.</p>
          <button type="button" onClick={retryVerification}>Tentar verificação novamente</button>
        </section>
      ) : null}
      {session.phase !== 'completed' && verification.kind === 'rejected' ? <p className="mission-error" role="alert">Evidência recusada: {verification.code}</p> : null}
      {session.phase !== 'completed' && completionStatus === 'failed' ? (
        <section className="verification-note" role="alert">
          <p>Não foi possível salvar a conclusão local.</p>
          <button type="button" onClick={saveCompletion}>Tentar salvar novamente</button>
        </section>
      ) : null}

      {session.error === undefined ? null : <p className="mission-error" role="alert">{session.error}</p>}
      <section className="mission-learning-layout" hidden={session.phase === 'completed'}>
        <section className="mission-runtime" aria-label="Atividade da missão">
          <iframe
            ref={frameRef}
            src={frameUrl}
            title={`Missão ${mission.title}`}
            sandbox="allow-forms allow-scripts allow-same-origin"
            onLoad={() => setLoadedFrameUrl(frameUrl)}
          />
        </section>
        <MentorPanel mission={mission} stage={session.stage} learner={learner} />
      </section>
      {session.phase === 'completed' ? (
        <ResultScreen
          completionStatus={completionStatus}
          summary={completionSummary}
          verification={verification}
          canonicalMasteryCount={learner.masteredCount}
          onRetryVerification={retryVerification}
          onRetrySave={saveCompletion}
          onReturn={onReturn}
        />
      ) : null}
      <footer className="mission-footer" hidden={session.phase === 'completed'}>
        <p>{mission.fallback.summary}</p>
      </footer>
    </main>
  )
}
