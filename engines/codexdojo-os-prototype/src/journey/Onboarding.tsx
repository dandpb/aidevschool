import { useMemo, useState } from 'react'
import type {
  OnboardingConfidence,
  OnboardingContext,
  OnboardingGoal,
  OnboardingInput,
} from '../progress/domain'
import { recommendTrack } from '../progress/domain'
import type { TrackId } from '../domain'

export function Onboarding({ onComplete }: { readonly onComplete: (input: OnboardingInput) => void }) {
  const [goal, setGoal] = useState<OnboardingGoal>('work-better')
  const [context, setContext] = useState<OnboardingContext>('work')
  const [confidence, setConfidence] = useState<OnboardingConfidence>('low')
  const recommendation = useMemo(() => recommendTrack({ goal, confidence }), [goal, confidence])
  const [selection, setSelection] = useState<TrackId | null>(null)
  const selectedTrackId = selection ?? recommendation

  return (
    <main className="journey-page onboarding-page">
      <header className="journey-brand">
        <span className="journey-cubes" aria-hidden="true"><i /><i /><i /><i /></span>
        <span><strong>AI DevSchool</strong><small>uma escola, duas trilhas</small></span>
      </header>
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <p className="journey-eyebrow">Seu primeiro passo</p>
        <h1 id="onboarding-title">O que você quer conseguir fazer com IA?</h1>
        <p className="journey-lead">Leva menos de um minuto. Você pode ajustar a recomendação e trocar de trilha depois.</p>

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

        <fieldset className="track-choice">
          <legend className="journey-sr-only">Escolha de trilha</legend>
          <button
            type="button"
            className={selectedTrackId === 'ai-pratica' ? 'track-option selected' : 'track-option'}
            aria-pressed={selectedTrackId === 'ai-pratica'}
            onClick={() => setSelection('ai-pratica')}
          >
            <span>Recomendada para começar</span>
            <strong>IA Prática</strong>
            <small>Aprenda a pedir, avaliar e aplicar sem precisar programar.</small>
          </button>
          <button
            type="button"
            className={selectedTrackId === 'dev' ? 'track-option selected' : 'track-option'}
            aria-pressed={selectedTrackId === 'dev'}
            onClick={() => setSelection('dev')}
          >
            <span>Trilha técnica</span>
            <strong>Dev</strong>
            <small>Pratique fundamentos e sistemas com desafios executáveis.</small>
          </button>
        </fieldset>
        <p className="recommendation-note" role="status">
          Recomendação: <strong>{recommendation === 'ai-pratica' ? 'IA Prática' : 'Trilha Dev'}</strong>. Você escolheu <strong>{selectedTrackId === 'ai-pratica' ? 'IA Prática' : 'Trilha Dev'}</strong>.
        </p>
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
