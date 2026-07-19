import { useEffect, useState } from "react";
import { useServices } from "../app/services";
import type {
  LearnerProgress,
  OnboardingConfidence,
  OnboardingContext,
  OnboardingGoal,
} from "../domain/progress";

/**
 * Onboarding em 3 telas curtas (plano seção 9): objetivo, contexto e
 * autoavaliação de confiança. Sem cadastro — ao final, a primeira lição começa
 * imediatamente. As opções são chrome do produto (não conteúdo de lição);
 * os valores de máquina ficam em inglês.
 */

const GOAL_OPTIONS: { value: OnboardingGoal; label: string }[] = [
  { value: "write_better", label: "Escrever textos e e-mails melhores" },
  { value: "save_time", label: "Economizar tempo em tarefas repetitivas" },
  { value: "verify_answers", label: "Conferir se a resposta da IA está certa" },
  { value: "protect_data", label: "Saber o que posso compartilhar com segurança" },
];

const CONTEXT_OPTIONS: { value: OnboardingContext; label: string }[] = [
  { value: "work", label: "No trabalho" },
  { value: "studies", label: "Nos estudos" },
  { value: "business", label: "No meu próprio negócio" },
  { value: "daily_life", label: "Na vida cotidiana" },
];

const CONFIDENCE_OPTIONS: { value: OnboardingConfidence; label: string }[] = [
  { value: "low", label: "Estou começando do zero" },
  { value: "medium", label: "Já usei, mas sem método" },
  { value: "high", label: "Uso bastante e quero refinar" },
];

const STEPS = [
  { key: "goal", question: "O que você quer melhorar com IA?" },
  { key: "context", question: "Onde você mais pretende usar IA?" },
  { key: "confidence", question: "Como você avalia sua confiança hoje?" },
] as const;

export function OnboardingScreen({ onDone }: { onDone: (progress: LearnerProgress) => void }) {
  const services = useServices();
  const track = services.content.getTrack();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [context, setContext] = useState<OnboardingContext | null>(null);
  const [confidence, setConfidence] = useState<OnboardingConfidence | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    services.analytics.track("onboarding_started");
  }, [services]);

  const currentValue = step === 0 ? goal : step === 1 ? context : confidence;
  const options = step === 0 ? GOAL_OPTIONS : step === 1 ? CONTEXT_OPTIONS : CONFIDENCE_OPTIONS;

  const handleSelect = (value: string) => {
    if (step === 0) setGoal(value as OnboardingGoal);
    else if (step === 1) setContext(value as OnboardingContext);
    else setConfidence(value as OnboardingConfidence);
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!goal || !context || !confidence || submitting) return;
    setSubmitting(true);
    const updated = await services.useCases.completeOnboarding({ goal, context, confidence });
    onDone(updated);
  };

  return (
    <section className="screen" data-testid="onboarding-screen" aria-labelledby="onboarding-title">
      <p className="eyebrow">{track.title}</p>
      <h1 id="onboarding-title">{STEPS[step].question}</h1>
      <p className="muted">
        Passo {step + 1} de {STEPS.length} — sem cadastro, direto para a primeira lição.
      </p>
      <div className="option-list" role="radiogroup" aria-label={STEPS[step].question}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`option-card${currentValue === option.value ? " is-selected" : ""}`}
          >
            <input
              type="radio"
              name={`onboarding-${STEPS[step].key}`}
              value={option.value}
              checked={currentValue === option.value}
              data-testid={`onboarding-option-${option.value}`}
              onChange={() => handleSelect(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        data-testid="onboarding-next"
        disabled={currentValue === null || submitting}
        onClick={() => void handleNext()}
      >
        {step < STEPS.length - 1 ? "Continuar" : "Começar a primeira lição"}
      </button>
    </section>
  );
}
