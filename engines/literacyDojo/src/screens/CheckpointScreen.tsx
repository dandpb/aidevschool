import { useEffect, useMemo, useRef, useState } from "react";
import { useServices } from "../app/services";
import { ActivityRenderer, isAnswerComplete } from "../components/ActivityRenderer";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { HintList } from "../components/HintList";
import { MentorGuide } from "../components/MentorGuide";
import { VoxelSkillArt } from "../components/VoxelSkillArt";
import { type ModuleCheckpointId, checkpointById } from "../domain/checkpoints";
import type { ActivityAnswer, EvaluationResult } from "../domain/evaluation";
import { emptyAnswerFor } from "../domain/evaluation";
import type { AttemptFeedback } from "../domain/feedback";
import type { LearnerProgress } from "../domain/progress";
import { findModule } from "../domain/track";

/**
 * Sessão de Desafio de Módulo do corredor literacy (spec AID-915 §3.3):
 * composição runtime de atividades já existentes, executadas no mesmo motor
 * do LessonScreen (avaliador determinístico, feedback e hints do conteúdo).
 * Cada tentativa passa por `submitActivityAttempt` com o lessonId ORIGINAL e
 * `context:"review"` — evidência e skills pelo caminho já existente.
 */
type SessionPhase = "intro" | "playing" | "done";

type AttemptState = {
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
};

export function CheckpointScreen({
  checkpointId,
  onProgressChange,
  onFinished,
  onExit,
  onStartNextLesson,
}: {
  checkpointId: ModuleCheckpointId;
  onProgressChange: (progress: LearnerProgress) => void;
  onFinished: (passed: boolean) => void;
  onExit: () => void;
  onStartNextLesson: (lessonId: string) => void;
}) {
  const services = useServices();
  const checkpoint = useMemo(() => checkpointById(checkpointId), [checkpointId]);
  const modules = services.content.listModules();
  const module = findModule(modules, checkpoint.moduleId);
  const nextModule = modules.find((entry) => entry.order === (module?.order ?? 0) + 1);
  const activityRefs = checkpoint.activityRefs;

  const [phase, setPhase] = useState<SessionPhase>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ActivityAnswer>>({});
  const [attempts, setAttempts] = useState<Record<string, AttemptState>>({});
  const [shownHints, setShownHints] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const busyRef = useRef(false);
  const [operationError, setOperationError] = useState<"start" | "attempt" | "finish" | null>(null);
  const [passed, setPassed] = useState(false);
  const [unlockedLessonId, setUnlockedLessonId] = useState<string | undefined>();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);
  const nextActionRef = useRef<HTMLButtonElement | null>(null);
  const restoreNextFocus = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: o efeito deve re-executar a cada mudança de fase/atividade (padrão do LessonScreen), embora não leia os valores.
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase, current]);

  const ref = activityRefs[current];
  const lesson = ref ? services.content.getLesson(ref.lessonId) : undefined;
  const activity = lesson?.activities.find((item) => item.id === ref?.activityId);
  const key = ref ? `${ref.lessonId}:${ref.activityId}` : "";
  const attempt = attempts[key];
  const hints = shownHints[key] ?? [];
  const hintCount = activity ? services.feedback.hintCount(activity) : 0;
  const hasMoreHints = hintCount > hints.length;
  useEffect(() => {
    if (
      attempt?.evaluation.pass &&
      restoreNextFocus.current &&
      document.activeElement === document.body
    ) {
      nextActionRef.current?.focus();
    }
  }, [attempt]);
  useEffect(() => {
    if (!submitting) return;
    const cancelRestore = () => {
      restoreNextFocus.current = false;
    };
    document.addEventListener("pointerdown", cancelRestore);
    document.addEventListener("focusin", cancelRestore);
    return () => {
      document.removeEventListener("pointerdown", cancelRestore);
      document.removeEventListener("focusin", cancelRestore);
    };
  }, [submitting]);
  const isLast = current === activityRefs.length - 1;
  const allPassed = activityRefs.every(
    (item) => attempts[`${item.lessonId}:${item.activityId}`]?.evaluation.pass,
  );

  if (!lesson || !activity || !module) {
    return (
      <section className="screen">
        <p role="alert">Atividade do desafio não encontrada.</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Voltar
        </button>
      </section>
    );
  }

  const answer = answers[key] ?? emptyAnswerFor(activity);

  const handleStart = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setOperationError(null);
    try {
      const { progress } = await services.useCases.startCheckpoint(checkpointId);
      onProgressChange(progress);
      setPhase("playing");
    } catch {
      setOperationError("start");
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (busyRef.current || !answer) return;
    restoreNextFocus.current = document.activeElement === submitRef.current;
    busyRef.current = true;
    setSubmitting(true);
    setOperationError(null);
    try {
      const result = await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer,
        context: "review",
      });
      setAttempts((previous) => ({ ...previous, [key]: result }));
      onProgressChange(result.progress);
    } catch {
      restoreNextFocus.current = false;
      setOperationError("attempt");
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleHint = () => {
    if (busyRef.current) return;
    setShownHints((previous) => {
      const currentHints = previous[key] ?? [];
      if (currentHints.length >= hintCount) return previous;
      const hint = services.feedback.hintFor(activity, currentHints.length);
      return hint === null ? previous : { ...previous, [key]: [...currentHints, hint] };
    });
  };

  const handleRetry = () => {
    if (busyRef.current) return;
    setOperationError(null);
    setAttempts((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setAnswers((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
    setShownHints((previous) => ({ ...previous, [key]: [] }));
  };

  const handleNext = () => {
    if (busyRef.current) return;
    setOperationError(null);
    setCurrent((index) => Math.min(index + 1, activityRefs.length - 1));
  };

  const handleFinish = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setOperationError(null);
    try {
      const bestScores: Record<string, number> = {};
      for (const item of activityRefs) {
        const state = attempts[`${item.lessonId}:${item.activityId}`];
        bestScores[`${item.lessonId}:${item.activityId}`] = state?.evaluation.score ?? 0;
      }
      const result = await services.useCases.completeCheckpoint({ checkpointId, bestScores });
      onProgressChange(result.progress);
      setPassed(result.outcome.passed);
      setUnlockedLessonId(result.unlockedLessonId);
      setPhase("done");
    } catch {
      setOperationError("finish");
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRetrySession = () => {
    setAttempts({});
    setShownHints({});
    setCurrent(0);
    setPhase("intro");
  };

  if (phase === "intro") {
    return (
      <section
        className="screen checkpoint-screen"
        data-testid="checkpoint-intro"
        aria-labelledby="checkpoint-title"
      >
        <p className="eyebrow">VILA LUME · CORREDOR</p>
        <h1 id="checkpoint-title" ref={headingRef} tabIndex={-1}>
          Desafio do Módulo {module.order}
        </h1>
        <div className="card village-request" data-testid="checkpoint-request">
          <h2>Desafio do Módulo {module.order}</h2>
          <p>
            Desafio do Módulo {module.order}: revise o que você aprendeu em {module.title}. É rápido
            — menos de 3 minutos.
          </p>
          <VoxelSkillArt skillId={module.skillIds[0]} />
        </div>
        <MentorGuide
          compact
          eyebrow="DICA DA LUMI"
          title="Revisar é ganhar"
          testId="checkpoint-guide"
        >
          <p>
            {activityRefs.length} atividades rápidas, uma de cada lição do bairro. Tente com o que
            você já sabe — se travar, peça uma dica.
          </p>
        </MentorGuide>
        {operationError === "start" && (
          <p role="alert" className="feedback feedback-fail">
            Não foi possível confirmar o início. Ele pode já ter sido registrado; tentar de novo
            pode contar outro início.
          </p>
        )}
        {submitting && <output>Iniciando desafio…</output>}
        <button
          type="button"
          className="btn btn-primary"
          data-testid="start-checkpoint"
          aria-disabled={submitting}
          onClick={() => void handleStart()}
        >
          Começar desafio
        </button>
        <button
          type="button"
          className="btn btn-link"
          aria-disabled={submitting}
          onClick={() => {
            if (!busyRef.current) onExit();
          }}
        >
          Sair do desafio
        </button>
      </section>
    );
  }

  if (phase === "done") {
    return (
      <section
        className="screen checkpoint-screen"
        data-testid="checkpoint-result"
        aria-labelledby="checkpoint-result-title"
      >
        <h1 id="checkpoint-result-title" ref={headingRef} tabIndex={-1}>
          {passed ? "Desafio concluído!" : "Não foi dessa vez."}
        </h1>
        {passed ? (
          checkpointId === "cp-03" ? (
            <div className="card" data-testid="checkpoint-celebration">
              <h2>Você completou os três primeiros bairros da Vila Lume! 🎉</h2>
              <p>
                Você completou os três primeiros bairros da Vila Lume! Continue para{" "}
                {nextModule?.title ?? "o próximo bairro"} — ou volte amanhã para sua revisão.
              </p>
            </div>
          ) : (
            <div className="card" data-testid="checkpoint-celebration">
              <h2>Bairro {module.order} completo!</h2>
              <p>Bairro {module.order} completo! Sua próxima revisão já está agendada.</p>
            </div>
          )
        ) : (
          <div className="card" data-testid="checkpoint-failure">
            <h2>Quase lá!</h2>
            <p>
              Não foi dessa vez. Você pode tentar de novo — o que você já concluiu continua valendo.
            </p>
          </div>
        )}
        {passed && unlockedLessonId && nextModule && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="checkpoint-next-lesson"
            onClick={() => onStartNextLesson(unlockedLessonId)}
          >
            Ir para {nextModule.title}
          </button>
        )}
        <button
          type="button"
          className={passed ? "btn btn-secondary" : "btn btn-primary"}
          data-testid={passed ? "checkpoint-home" : "checkpoint-retry-session"}
          onClick={() => {
            if (passed) {
              onFinished(passed);
            } else {
              handleRetrySession();
            }
          }}
        >
          {passed ? "Voltar ao início" : "Tentar de novo"}
        </button>
      </section>
    );
  }

  return (
    <section className="screen" data-testid="checkpoint-player" aria-labelledby="activity-heading">
      <p className="eyebrow">
        VILA LUME · Desafio do Módulo {module.order} · atividade {current + 1} de{" "}
        {activityRefs.length}
      </p>
      {/* AID-1755/T3 (padrão AID-1150): o contador de atividade vive num live
          region sr-only — o foco no h1 anuncia a nova instrução e o status
          anuncia o passo ("Atividade N de M"); semânticas separadas, sem
          sobreposição de fala. O eyebrow visível segue como referência
          visual; o <output> carrega role="status" implícito. */}
      <output className="sr-only" data-testid="checkpoint-activity-status">
        {`Atividade ${current + 1} de ${activityRefs.length}`}
      </output>
      <h1 id="activity-heading" className="activity-instruction" ref={headingRef} tabIndex={-1}>
        {activity.instruction}
      </h1>

      <VoxelSkillArt skillId={activity.skillId} />

      <ActivityRenderer
        activity={activity}
        answer={answer}
        invalidIds={attempt && !attempt.evaluation.pass ? failedCheckIds(attempt) : []}
        disabled={submitting}
        onChange={(next) => {
          if (!busyRef.current) setAnswers((previous) => ({ ...previous, [key]: next }));
        }}
      />

      {attempt && <FeedbackPanel feedback={attempt.feedback} hintsShown={hints} />}
      {!attempt && (
        <div aria-live="polite" aria-atomic="true">
          <HintList hints={hints} />
        </div>
      )}

      {operationError === "attempt" && (
        <p role="alert" className="feedback feedback-fail">
          Não foi possível confirmar o resultado. A tentativa pode já ter sido registrada; ao tentar
          de novo ela poderá ser contada outra vez.
        </p>
      )}
      {operationError === "finish" && (
        <p role="alert" className="feedback feedback-fail">
          Não foi possível confirmar a conclusão. Ela pode já ter sido registrada. Ao recarregar,
          confira o progresso salvo; as respostas desta sessão serão perdidas.
        </p>
      )}
      {submitting && <output>Registrando progresso…</output>}
      <div className="actions">
        {!attempt?.evaluation.pass && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="submit-attempt"
            ref={submitRef}
            disabled={!isAnswerComplete(activity, answer)}
            aria-disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {attempt ? "Verificar de novo" : "Verificar resposta"}
          </button>
        )}
        {attempt && !attempt.evaluation.pass && (
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="retry-activity"
            aria-disabled={submitting}
            onClick={handleRetry}
          >
            Tentar novamente
          </button>
        )}
        {hintCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="hint-button"
            aria-disabled={!hasMoreHints || submitting}
            onClick={handleHint}
          >
            {hasMoreHints ? "Pedir dica" : "Todas as dicas exibidas"}
          </button>
        )}
        {attempt?.evaluation.pass && !isLast && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="next-activity"
            ref={nextActionRef}
            aria-disabled={submitting}
            onClick={handleNext}
          >
            Próxima atividade
          </button>
        )}
        {attempt?.evaluation.pass && isLast && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="finish-checkpoint"
            ref={nextActionRef}
            disabled={!allPassed}
            aria-disabled={submitting}
            onClick={() => void handleFinish()}
          >
            Concluir desafio
          </button>
        )}
      </div>
      <button
        type="button"
        className="btn btn-link"
        aria-disabled={submitting}
        onClick={() => {
          if (!busyRef.current) onExit();
        }}
      >
        Sair do desafio
      </button>
    </section>
  );
}

function failedCheckIds(attempt: AttemptState): string[] {
  return attempt.evaluation.checks.filter((check) => !check.passed).map((check) => check.id);
}
