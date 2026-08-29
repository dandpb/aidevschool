import { useState } from "react";
import { useServices } from "../app/services";
import { MentorGuide } from "../components/MentorGuide";
import { VoxelTaskArt, taskDetails } from "../components/VoxelTaskArt";
import { VoxelWorld } from "../components/VoxelWorld";
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
  { key: "welcome", question: "Chegue à Vila Lume" },
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
      // ponytail: MVP só tem a trilha IA na Prática; Trilha Dev é teaser "em breve".
      audience: "ia_pratica",
    });
    onDone(updated);
  };

  return (
    <section
      className={`screen onboarding-screen onboarding-step-${currentStep.key}`}
      data-testid="onboarding-screen"
      aria-labelledby="onboarding-title"
    >
      <div className="onboarding-heading">
        <div>
          <p className="eyebrow">{track.title}</p>
          <h1 id="onboarding-title">{currentStep.question}</h1>
        </div>
        <div className="onboarding-progress">
          <span className="sr-only">{`Etapa ${step + 1} de ${STEPS.length}`}</span>
          {STEPS.map((item, index) => (
            <span key={item.key} className={index <= step ? "is-active" : ""} aria-hidden="true" />
          ))}
        </div>
      </div>

      {currentStep.key === "welcome" ? (
        <div className="welcome-layout">
          <VoxelWorld variant="welcome" />
          <div className="welcome-content">
            <MentorGuide testId="assistant-welcome">
              <p>
                Eu sou a Lumi. Os moradores trazem pedidos curtos e você aprende a usar IA ajudando
                a vila, uma escolha de cada vez.
              </p>
              <p className="muted">
                Aqui não existe pressa nem punição: tente, confira, peça uma dica e ajuste quando
                precisar.
              </p>
            </MentorGuide>

            <div className="audience-routes" aria-label="Trilhas do AI Dev School">
              <div className="audience-route audience-route-active">
                <span className="route-icon" aria-hidden="true">
                  🌱
                </span>
                <div>
                  <strong>Vila Lume</strong>
                  <small>Aprenda IA para o dia a dia ajudando moradores.</small>
                </div>
                <span className="route-badge">Disponível</span>
              </div>
              <div className="audience-route audience-route-coming" data-testid="dev-track-teaser">
                <span className="route-icon" aria-hidden="true">
                  ⌁
                </span>
                <div>
                  <strong>Trilha Dev</strong>
                  <small>Agentes, APIs e apps com IA.</small>
                </div>
                <span className="route-badge">Em breve</span>
              </div>
            </div>

            <div className="privacy-note">
              <span aria-hidden="true">◆</span>
              <p>
                <strong>Piloto gratuito para maiores de 18 anos.</strong> Seu progresso fica somente
                neste navegador, sem conta e sem registrar detalhes das suas tarefas. Ao continuar,
                você concorda com os <a href="./termos.html">termos do piloto</a> e leu o{" "}
                <a href="./privacidade.html">aviso de privacidade</a>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="onboarding-question-layout">
          <div>
            <p className="step-copy">
              Etapa {step + 1} de {STEPS.length} · personalize seu primeiro mundo
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
                    <span className="option-check" aria-hidden="true">
                      ✓
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <MentorGuide compact>
            <p>Não existe resposta certa aqui. Isso só ajuda a escolher exemplos mais úteis.</p>
          </MentorGuide>
        </div>
      )}

      <div className="onboarding-actions">
        {step > 0 && (
          <button type="button" className="btn btn-link btn-back" onClick={() => setStep(step - 1)}>
            Voltar
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          data-testid="onboarding-next"
          disabled={(currentStep.key !== "welcome" && currentValue === null) || submitting}
          onClick={() => void handleNext()}
        >
          {step < STEPS.length - 1 ? "Continuar jornada" : "Abrir mapa da Vila Lume"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
