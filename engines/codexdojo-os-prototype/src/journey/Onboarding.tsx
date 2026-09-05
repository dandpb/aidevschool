import { useMemo, useState } from 'react'
import type {
  OnboardingConfidence,
  OnboardingContext,
  OnboardingGoal,
  OnboardingInput,
} from '../progress/domain'
import type { TrackId } from '../domain'
import {
  HOSTED_SIMULATIONS_TRACK_ID,
  STUDENT_TRACK_ID,
  requestedTrackIdFromSearch,
} from './studentPath'

export function Onboarding({
  onComplete,
  initialTrackId,
}: {
  readonly onComplete: (input: OnboardingInput) => void
  readonly initialTrackId?: TrackId
}) {
  const [goal, setGoal] = useState<OnboardingGoal>('work-better')
  const [context, setContext] = useState<OnboardingContext>('work')
  const [confidence, setConfidence] = useState<OnboardingConfidence>('low')
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>(
    () => initialTrackId ?? requestedTrackIdFromSearch() ?? STUDENT_TRACK_ID,
  )
  const recommendationCopy = useMemo(() => {
    if (selectedTrackId === HOSTED_SIMULATIONS_TRACK_ID) {
      return confidence === 'low'
        ? 'Trilho Dev: WAREHOUSE → WORMHOLE → RELAY STATION. IA Prática continua a um clique se você quiser um começo mais guiado.'
        : 'Trilho Dev: WAREHOUSE → WORMHOLE → RELAY STATION. Outras simulações ficam no Engine Hub.'
    }
    if (goal === 'build-systems' && confidence !== 'low') {
      return 'Sugerimos a trilha Dev. IA Prática permanece disponível se você quiser começar pelo no-code.'
    }
    return 'Sugerimos IA Prática. A trilha Dev permanece clicável.'
  }, [confidence, goal, selectedTrackId])

  return (
    <main className="journey-page onboarding-page">
      <header className="journey-brand">
        <span className="journey-cubes" aria-hidden="true"><i /><i /><i /><i /></span>
        <span><strong>AI DevSchool</strong><small>escolha sua trilha</small></span>
      </header>
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <p className="journey-eyebrow">Seu primeiro passo</p>
        <h1 id="onboarding-title">O que você quer conseguir fazer com IA?</h1>
        <p className="journey-lead">Leva menos de um minuto. Escolha IA Prática ou Dev. Sem conta; o progresso fica neste dispositivo.</p>

        <div className="onboarding-fields">
          <label>
            Objetivo
            <select value={goal} onChange={(event) => setGoal(event.target.value as OnboardingGoal)}>
              <option value="work-better">Usar IA melhor no trabalho</option>
              <option value="understand-ai">Entender respostas e riscos</option>
              <option value="build-systems">Construir sistemas com IA</option>
            </select>
          </label>
          <label>
            Contexto
            <select value={context} onChange={(event) => setContext(event.target.value as OnboardingContext)}>
              <option value="work">Trabalho</option>
              <option value="studies">Estudos</option>
              <option value="personal-project">Projeto pessoal</option>
            </select>
          </label>
          <label>
            Confiança atual
            <select value={confidence} onChange={(event) => setConfidence(event.target.value as OnboardingConfidence)}>
              <option value="low">Estou começando</option>
              <option value="medium">Já experimentei algumas vezes</option>
              <option value="high">Uso com frequência</option>
            </select>
          </label>
        </div>

        <div className="track-choice" role="radiogroup" aria-label="Trilha">
          <button
            type="button"
            className={selectedTrackId === STUDENT_TRACK_ID ? 'track-option selected' : 'track-option'}
            aria-pressed={selectedTrackId === STUDENT_TRACK_ID}
            data-testid="track-option-ai-pratica"
            onClick={() => setSelectedTrackId(STUDENT_TRACK_ID)}
          >
            <span>Recomendada para começar</span>
            <strong>IA Prática</strong>
            <small>Microlições no-code hospedadas. Conclusão local neste dispositivo, nunca domínio.</small>
          </button>
          <button
            type="button"
            className={selectedTrackId === HOSTED_SIMULATIONS_TRACK_ID ? 'track-option selected' : 'track-option'}
            aria-pressed={selectedTrackId === HOSTED_SIMULATIONS_TRACK_ID}
            data-testid="track-option-dev"
            onClick={() => setSelectedTrackId(HOSTED_SIMULATIONS_TRACK_ID)}
          >
            <span>Para programadores</span>
            <strong>Dev</strong>
            <small>Trilho guiado: WAREHOUSE → WORMHOLE → RELAY STATION. O Engine Hub abre as outras simulações.</small>
          </button>
        </div>
        <p className="recommendation-note" role="status">{recommendationCopy}</p>
        <button
          type="button"
          className="journey-primary"
          onClick={() => onComplete({ goal, context, confidence, selectedTrackId })}
        >
          Entrar na escola
        </button>
        <p className="local-note">Sem conta: o progresso fica neste dispositivo.</p>
      </section>
    </main>
  )
}
