import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emitAnalyticsSafely } from '../analytics/events'
import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionSessionController, MissionSessionSnapshot } from './MissionSessionController'
import type { EvidenceVerificationState } from '../verification/ports'
import { ResultScreen, type MissionCompletionSummary } from '../journey/ResultScreen'
import { MentorPanel } from '../mentor/MentorPanel'
import { MissionStatusControls } from './MissionStatusControls'
import {
  createInitialRendererState,
  type RendererPreference,
} from '../rendering/domain'

const INITIAL_SESSION: MissionSessionSnapshot = {
  phase: 'handshaking',
  stage: 'understand',
  progress: 0,
  renderer: createInitialRendererState(),
}

type CompletionStatus = 'idle' | 'saving' | 'saved' | 'failed'

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
  const trackLabel = mission.trackId === 'dev' ? 'Simulação hospedada' : 'IA Prática'
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

      {session.phase === 'completed' ? null : (
        <MissionStatusControls
          mission={mission}
          session={session}
          verification={verification}
          completionStatus={completionStatus}
          onRetryRenderer={retryRenderer}
          onRetryVerification={retryVerification}
          onRetrySave={saveCompletion}
        />
      )}
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
