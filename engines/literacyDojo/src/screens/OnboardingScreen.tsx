import { useEffect, useState } from "react";
import { useServices } from "../app/services";
import { VoxelTaskArt, taskDetails } from "../components/VoxelTaskArt";
import type {
  LearnerProgress,
  OnboardingConfidence,
  OnboardingContext,
  OnboardingGoal,
  OnboardingTaskCategory,
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

const TASK_OPTIONS: OnboardingTaskCategory[] = ["scheduling", "communication", "news_research"];

const STEPS = [
  { key: "welcome", question: "Vamos começar com uma conversa" },
  { key: "goal", question: "O que você quer melhorar com IA?" },
  { key: "context", question: "Onde você mais pretende usar IA?" },
  { key: "confidence", question: "Como você avalia sua confiança hoje?" },
  { key: "task", question: "Qual situação você quer explorar primeiro?" },
] as const;

export function OnboardingScreen({ onDone }: { onDone: (progress: LearnerProgress) => void }) {
  const services = useServices();
  const track = services.content.getTrack();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [context, setContext] = useState<OnboardingContext | null>(null);
  const [confidence, setConfidence] = useState<OnboardingConfidence | null>(null);
  const [taskCategory, setTaskCategory] = useState<OnboardingTaskCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    services.analytics.track("onboarding_started");
  }, [services]);

  const currentStep = STEPS[step];
  const currentValue =
    currentStep.key === "goal"
      ? goal
      : currentStep.key === "context"
        ? context
        : currentStep.key === "confidence"
          ? confidence
          : currentStep.key === "task"
            ? taskCategory
            : "welcome";
  const options =
    currentStep.key === "goal"
      ? GOAL_OPTIONS
      : currentStep.key === "context"
        ? CONTEXT_OPTIONS
        : currentStep.key === "confidence"
          ? CONFIDENCE_OPTIONS
          : TASK_OPTIONS;

  const handleSelect = (value: string) => {
    if (currentStep.key === "goal") setGoal(value as OnboardingGoal);
    else if (currentStep.key === "context") setContext(value as OnboardingContext);
    else if (currentStep.key === "confidence") setConfidence(value as OnboardingConfidence);
    else if (currentStep.key === "task") setTaskCategory(value as OnboardingTaskCategory);
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!goal || !context || !confidence || !taskCategory || submitting) return;
    setSubmitting(true);
    const updated = await services.useCases.completeOnboarding({
      goal,
      context,
      confidence,
      taskCategory,
    });
    onDone(updated);
  };

  return (
    <section className="screen" data-testid="onboarding-screen" aria-labelledby="onboarding-title">
      <p className="eyebrow">{track.title}</p>
      <h1 id="onboarding-title">{currentStep.question}</h1>
      {currentStep.key === "welcome" ? (
        <>
          <div className="assistant-welcome" data-testid="assistant-welcome">
            <div className="voxel-scene voxel-scene-assistant" aria-hidden="true">
              <span className="voxel voxel-one" />
              <span className="voxel voxel-two" />
              <span className="voxel voxel-three" />
            </div>
            <div>
              <p>
                Eu sou seu assistente de IA para aprender fazendo. Uma IA geral pode ajudar a
                organizar, resumir, comparar opções e criar rascunhos.
              </p>
              <p className="muted">
                Ela não substitui seu julgamento: você decide o que usar e o que conferir.
              </p>
            </div>
          </div>
          <div className="card card-note">
            <h2>Seu progresso fica neste navegador</h2>
            <p>Sem conta, sem instalação e sem registrar detalhes das suas tarefas.</p>
          </div>
          <div className="dev-teaser" data-testid="dev-track-teaser">
            <strong>Trilha Dev</strong>
            <span>Em breve: IA para quem programa.</span>
          </div>
        </>
      ) : (
        <>
          <p className="muted">
            Passo {step + 1} de {STEPS.length} — sem cadastro, direto para o seu Mapa Inicial.
          </p>
          <div className="option-list" role="radiogroup" aria-label={currentStep.question}>
            {options.map((option) => {
              const task = typeof option === "string" ? taskDetails(option) : undefined;
              const value = typeof option === "string" ? option : option.value;
              const label = typeof option === "string" ? taskDetails(option).label : option.label;
              return (
                <label
                  key={value}
                  className={`option-card${currentValue === value ? " is-selected" : ""}${task ? " task-option" : ""}`}
                >
                  <input
                    type="radio"
                    name={`onboarding-${currentStep.key}`}
                    value={value}
                    checked={currentValue === value}
                    data-testid={`onboarding-option-${value}`}
                    onChange={() => handleSelect(value)}
                  />
                  {task && <VoxelTaskArt category={value as OnboardingTaskCategory} />}
                  <span>
                    <strong>{label}</strong>
                    {task && <small>{task.guidance}</small>}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}
      <button
        type="button"
        className="btn btn-primary"
        data-testid="onboarding-next"
        disabled={(currentStep.key !== "welcome" && currentValue === null) || submitting}
        onClick={() => void handleNext()}
      >
        {step < STEPS.length - 1 ? "Continuar" : "Começar meu Mapa Inicial"}
      </button>
    </section>
  );
}
