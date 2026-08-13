import { useEffect, useMemo, useState } from 'react'
import { emitAnalyticsSafely } from '../analytics/events'
import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition, MissionStage } from '../domain'
import { buildMentorContext } from './context'
import type { MentorMode, MentorStapStage, MentorTurn } from './contracts'
import { MentorController, type MentorControllerResult, type MentorControllerState } from './mentorController'

const HINT_QUOTA = 5

function requestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `mentor-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function initialPrompt(mode: MentorMode): string {
  if (mode === 'explain') return 'Explique este conceito por outra perspectiva.'
  if (mode === 'hint') return 'Ajude-me com uma pista menor para continuar.'
  return 'Que pergunta pode me ajudar a pensar no proximo passo?'
}

function sourceLabel(result: MentorControllerResult | undefined): string {
  if (result?.source === 'provider') return 'Resposta do provedor de IA'
  if (result?.source === 'fallback') return 'Orientacao local deterministica'
  if (result?.source === 'policy') return 'Limite pedagogico local'
  return 'Coach contextual'
}

export function MentorPanel({
  mission,
  stage,
  learner,
}: {
  readonly mission: MissionDefinition
  readonly stage: MissionStage
  readonly learner: LearnerSnapshot
}) {
  const services = useServices()
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<MentorMode>('question')
  const [question, setQuestion] = useState(initialPrompt('question'))
  const [declaredConfusion, setDeclaredConfusion] = useState('')
  const [attemptExcerpt, setAttemptExcerpt] = useState('')
  const [turns, setTurns] = useState<readonly MentorTurn[]>([])
  const [stapStage, setStapStage] = useState<MentorStapStage>('checking')
  const [hintQuotaUsed, setHintQuotaUsed] = useState(0)
  const [controllerState, setControllerState] = useState<MentorControllerState>({ kind: 'idle' })
  const [lastResult, setLastResult] = useState<MentorControllerResult>()
  const contextKey = `${mission.id}:${mission.version}:${stage}`
  const controller = useMemo(
    () => new MentorController({ provider: services.mentor, onState: setControllerState }),
    [services.mentor],
  )

  useEffect(() => () => controller.close(), [controller])

  useEffect(() => {
    if (contextKey.length === 0) return
    controller.contextChanged()
    setTurns([])
    setLastResult(undefined)
    setStapStage('checking')
    setHintQuotaUsed(0)
  }, [contextKey, controller])

  const selectMode = (nextMode: MentorMode) => {
    setMode(nextMode)
    setQuestion(initialPrompt(nextMode))
  }

  const close = () => {
    controller.cancel()
    setOpen(false)
  }

  const submit = async () => {
    const prompt = question.trim()
    if (prompt === '') return
    const request = buildMentorContext({
      requestId: requestId(),
      mode,
      mission,
      currentStage: stage,
      question: prompt,
      declaredConfusion,
      attemptExcerpt,
      recentTurns: turns,
      learnerLevel: learner.profile,
      stapStage,
      stalls: 0,
      hintQuota: { used: hintQuotaUsed, limit: HINT_QUOTA },
    })
    const result = await controller.submit(request)
    if (result === undefined) return
    if (mode === 'hint') {
      emitAnalyticsSafely(services.analytics, {
        name: 'hint.requested',
        dimensions: {
          mode,
          source: result.source,
          outcome: result.response.outcome,
        },
        context: { trackId: mission.trackId, missionId: mission.id },
      })
    }
    setLastResult(result)
    setTurns((current) => [
      ...current,
      { role: 'learner', content: prompt },
      { role: 'mentor', content: result.response.response },
    ].slice(-6) as readonly MentorTurn[])
    if (result.consumeHintQuota) setHintQuotaUsed((used) => Math.min(HINT_QUOTA, used + 1))
    if (result.advancePedagogy) setStapStage(result.response.pedagogy.stageAfter)
  }

  if (!open) {
    return (
      <button type="button" className="mentor-reopen" onClick={() => setOpen(true)}>
        Abrir Mentor IA
      </button>
    )
  }

  const busy = controllerState.kind === 'requesting'
  const response = lastResult?.response

  return (
    <aside className="contextual-mentor" aria-label="Mentor IA contextual">
      <header>
        <div>
          <span className="mentor-ai-label">IA</span>
          <div><strong>Mentor contextual</strong><small>{sourceLabel(lastResult)} · sem ferramentas</small></div>
        </div>
        <button type="button" className="mentor-close" aria-label="Fechar Mentor IA" onClick={close}>×</button>
      </header>

      <p className="mentor-mission-context"><strong>{mission.title}</strong><br />Etapa atual: {stage}</p>

      <fieldset className="mentor-mode">
        <legend className="journey-sr-only">Tipo de ajuda</legend>
        <button type="button" aria-pressed={mode === 'question'} onClick={() => selectMode('question')}>Pergunta</button>
        <button type="button" aria-pressed={mode === 'explain'} onClick={() => selectMode('explain')}>Explicar</button>
        <button type="button" aria-pressed={mode === 'hint'} onClick={() => selectMode('hint')}>Pista</button>
      </fieldset>

      <label className="mentor-field">
        <span>Sua pergunta</span>
        <textarea value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} />
      </label>

      {mode === 'hint' ? (
        <div className="mentor-attempt-fields">
          <label className="mentor-field">
            <span>O que voce tentou</span>
            <textarea value={attemptExcerpt} maxLength={1_000} onChange={(event) => setAttemptExcerpt(event.target.value)} placeholder="Descreva ou cole apenas o trecho que voce quer discutir." />
          </label>
          <label className="mentor-field">
            <span>Ponto exato de confusao</span>
            <input value={declaredConfusion} maxLength={300} onChange={(event) => setDeclaredConfusion(event.target.value)} placeholder="Onde seu raciocinio travou?" />
          </label>
        </div>
      ) : null}

      <button type="button" className="mentor-submit" disabled={busy || question.trim() === ''} onClick={() => void submit()}>
        {busy ? 'Pensando…' : 'Pedir ajuda'}
      </button>

      <div className="mentor-response" aria-live="polite" aria-busy={busy}>
        {busy ? <p>O mentor esta preparando uma pergunta curta.</p> : null}
        {response === undefined && !busy ? <p>Eu ajudo com perguntas e pistas graduais, sem selecionar a resposta.</p> : null}
        {response !== undefined && !busy ? (
          <>
            <strong>{response.outcome === 'answered' ? 'Proximo raciocinio' : 'Antes de continuar'}</strong>
            <p>{response.response}</p>
          </>
        ) : null}
      </div>

      <footer>
        <span>Pistas do provedor: {hintQuotaUsed}/{HINT_QUOTA}</span>
        <span>Nao cria evidencia nem avalia dominio.</span>
      </footer>
    </aside>
  )
}
