import { useMemo, useState } from 'react'
import type {
  OnboardingConfidence,
  OnboardingContext,
  OnboardingGoal,
  OnboardingInput,
} from '../progress/domain'
import { STUDENT_TRACK_ID } from './studentPath'

export function Onboarding({ onComplete }: { readonly onComplete: (input: OnboardingInput) => void }) {
  const [goal, setGoal] = useState<OnboardingGoal>('work-better')
  const [context, setContext] = useState<OnboardingContext>('work')
  const [confidence, setConfidence] = useState<OnboardingConfidence>('low')
  const selectedTrackId = STUDENT_TRACK_ID
  const recommendationCopy = useMemo(() => {
    if (goal === 'build-systems' && confidence !== 'low') {
      return 'As simulações hospedadas entram depois de IA Prática, sem menu de motores.'
    }
    return 'Comece por IA Prática e siga a sequência publicada pelo OS.'
  }, [confidence, goal])

  return (
    <main className="journey-page onboarding-page">
      <header className="journey-brand">
        <span className="journey-cubes" aria-hidden="true"><i /><i /><i /><i /></span>
        <span><strong>AI DevSchool</strong><small>IA Prática no OS</small></span>
      </header>
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <p className="journey-eyebrow">Seu primeiro passo</p>
        <h1 id="onboarding-title">O que você quer conseguir fazer com IA?</h1>
        <p className="journey-lead">Leva menos de um minuto. O piloto começa em IA Prática e continua nas simulações hospedadas.</p>

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

        <article className="track-option selected" aria-label="Trilha do piloto">
          <span>Sequência do piloto</span>
          <strong>IA Prática</strong>
          <small>IA Prática com a LiteracyDojo hospedada, depois a trilha dev no OS: WAREHOUSE, WORMHOLE, RELAY STATION, PIPELINE PLANT, CHECKPOINT CITY, TIMELINE TOWER e DOCKING BAY.</small>
        </article>
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
