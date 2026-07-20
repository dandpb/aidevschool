import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityResultSummary, LessonSummary } from "../app/App";
import { useServices } from "../app/services";
import { ActivityRenderer, emptyAnswerFor, isAnswerComplete } from "../components/ActivityRenderer";
import { FeedbackPanel } from "../components/FeedbackPanel";
import type { LessonDefinition } from "../data/generated/lessons";
import type { ActivityAnswer, EvaluationResult } from "../domain/evaluation";
import type { AttemptFeedback } from "../domain/feedback";
import type { Achievement, LearnerProgress } from "../domain/progress";
import { findModule } from "../domain/track";

type AttemptState = {
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
};

export type LessonMode = "initial" | "review";

/**
 * Player de lição (plano seção 9): uma ideia por tela — introdução curta com a
 * situação, tentativa antes da explicação completa, feedback acionável
 * ("ainda falta X") e tentar novamente. Modo "review" (Fase 2): re-executa as
 * atividades de uma lição concluída como revisão espaçada, emitindo evidência
 * com contexto de revisão. Respostas são transitórias: recarregar retoma no
 * início da lição em andamento (ver resumeSession).
 */
export function LessonScreen({
  lessonId,
  mode = "initial",
  onProgressChange,
  onCompleted,
  onExit,
}: {
  lessonId: string;
  mode?: LessonMode;
  onProgressChange: (progress: LearnerProgress) => void;
  onCompleted: (progress: LearnerProgress, summary: LessonSummary) => void;
  onExit: () => void;
}) {
  const services = useServices();
  const lesson = useMemo(() => services.content.getLesson(lessonId), [services, lessonId]);
  const module = lesson ? findModule(services.content.listModules(), lesson.moduleId) : undefined;

  const [stage, setStage] = useState<"intro" | number>("intro");
  const [answers, setAnswers] = useState<Record<string, ActivityAnswer>>({});
  const [latest, setLatest] = useState<Record<string, AttemptState>>({});
  const [best, setBest] = useState<Record<string, AttemptState>>({});
  const [hintIndexByActivity, setHintIndexByActivity] = useState<Record<string, number>>({});
  const [hintsShownByActivity, setHintsShownByActivity] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<Date | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Abertura da lição (status in_progress + lesson_started) ou da revisão (review_started).
  useEffect(() => {
    let cancelled = false;
    const opening =
      mode === "review"
        ? services.useCases.startReview(lessonId).then((result) => result.progress)
        : services.useCases.startLesson(lessonId);
    void opening.then((progress) => {
      if (!cancelled) onProgressChange(progress);
    });
    return () => {
      cancelled = true;
    };
  }, [services, lessonId, mode, onProgressChange]);

  // Gerenciamento de foco: o título recebe foco a cada nova tela do player
  // (introdução e cada atividade), orientando teclado e leitor de tela.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o efeito deve re-executar a cada mudança de tela (stage), embora não leia o valor.
  useEffect(() => {
    headingRef.current?.focus();
  }, [stage]);

  if (!lesson) {
    return (
      <section className="screen">
        <p role="alert">Lição não encontrada.</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Voltar
        </button>
      </section>
    );
  }

  const activities = lesson.activities;
  const currentIndex = typeof stage === "number" ? stage : 0;
  const activity = activities[currentIndex];
  const answer = answers[activity.id] ?? emptyAnswerFor(activity);
  const attempt = latest[activity.id];
  const hintsShown = hintsShownByActivity[activity.id] ?? [];
  const hintIndex = hintIndexByActivity[activity.id] ?? 0;
  const hasMoreHints = services.feedback.hintCount(activity) > hintIndex;
  const isLastActivity = currentIndex === activities.length - 1;
  const requiredPassed = lesson.completion.requiredActivityIds.every(
    (id) => best[id]?.evaluation.pass,
  );

  const updateAnswer = (next: ActivityAnswer) =>
    setAnswers((previous) => ({ ...previous, [activity.id]: next }));

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer,
        context: mode,
      });
      const state: AttemptState = { evaluation: result.evaluation, feedback: result.feedback };
      setLatest((previous) => ({ ...previous, [activity.id]: state }));
      setBest((previous) => {
        const previousBest = previous[activity.id];
        if (!previousBest || result.evaluation.score >= previousBest.evaluation.score) {
          return { ...previous, [activity.id]: state };
        }
        return previous;
      });
      onProgressChange(result.progress);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHint = async () => {
    const result = await services.useCases.requestHint({
      lessonId: lesson.id,
      activityId: activity.id,
      hintIndex,
    });
    setHintIndexByActivity((previous) => ({ ...previous, [activity.id]: result.nextIndex }));
    if (result.hint !== null) {
      setHintsShownByActivity((previous) => ({
        ...previous,
        [activity.id]: [...(previous[activity.id] ?? []), result.hint as string],
      }));
    }
  };

  const handleRetry = async () => {
    await services.useCases.retryActivity({ lessonId: lesson.id, activityId: activity.id });
    setAnswers((previous) => ({ ...previous, [activity.id]: emptyAnswerFor(activity) }));
    setLatest((previous) => {
      const next = { ...previous };
      delete next[activity.id];
      return next;
    });
  };

  const handleNextActivity = () => setStage(currentIndex + 1);

  const handleFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const bestScores = Object.fromEntries(
        Object.entries(best).map(([id, state]) => [id, state.evaluation.score]),
      );
      const startedAt = startedAtRef.current;
      const durationSeconds = startedAt
        ? Math.max(0, Math.round((services.clock.now().getTime() - startedAt.getTime()) / 1000))
        : undefined;
      if (mode === "review") {
        const result = await services.useCases.completeReview({
          lessonId: lesson.id,
          bestScores,
        });
        if (!result.outcome.completed) return;
        const summary = buildSummary(lesson, best, result.outcome.lessonScore, {
          mode,
        });
        onCompleted(result.progress, summary);
        return;
      }
      const result = await services.useCases.completeLesson({
        lessonId: lesson.id,
        bestScores,
        durationSeconds,
      });
      if (!result.outcome.completed) return;
      const summary = buildSummary(lesson, best, result.outcome.lessonScore, {
        mode,
        nextLessonId: result.nextLessonId,
        newlyUnlocked: result.newlyUnlocked,
      });
      onCompleted(result.progress, summary);
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "intro") {
    return (
      <section className="screen" data-testid="lesson-intro" aria-labelledby="lesson-title">
        {module && <p className="eyebrow">{module.title}</p>}
        <h1 id="lesson-title" ref={headingRef} tabIndex={-1}>
          {mode === "review" ? `Revisão: ${lesson.title}` : lesson.title}
        </h1>
        <p className="muted">
          {lesson.estimatedMinutes} min ·{" "}
          {lesson.skillIds.map((id) => services.content.getSkillTitle(id)).join(", ")}
        </p>
        <div className="card">
          <h2>{mode === "review" ? "Hora de revisar" : "Nesta lição"}</h2>
          <p>
            {mode === "review"
              ? "Repetir é o que fixa: refaça a atividade desta lição para manter o conteúdo vivo. A revisão não muda seu progresso na trilha."
              : lesson.objective}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          data-testid="start-lesson"
          onClick={() => {
            startedAtRef.current = services.clock.now();
            setStage(0);
          }}
        >
          {mode === "review" ? "Começar revisão" : "Começar"}
        </button>
        <button type="button" className="btn btn-link" onClick={onExit}>
          {mode === "review" ? "Sair da revisão" : "Sair da lição"}
        </button>
      </section>
    );
  }

  return (
    <section className="screen" data-testid="lesson-player" aria-labelledby="activity-heading">
      <p className="eyebrow">
        {mode === "review" ? "Revisão · " : ""}
        {lesson.title} · atividade {currentIndex + 1} de {activities.length}
      </p>
      <h1 id="activity-heading" className="activity-instruction" ref={headingRef} tabIndex={-1}>
        {activity.instruction}
      </h1>

      <ActivityRenderer
        activity={activity}
        answer={answer}
        invalidIds={attempt && !attempt.evaluation.pass ? failedCheckIds(attempt) : []}
        disabled={false}
        onChange={updateAnswer}
      />

      {attempt && <FeedbackPanel feedback={attempt.feedback} hintsShown={hintsShown} />}

      <div className="actions">
        {!attempt?.evaluation.pass && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="submit-attempt"
            disabled={!isAnswerComplete(activity, answer) || submitting}
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
            onClick={() => void handleRetry()}
          >
            Tentar novamente
          </button>
        )}
        {hasMoreHints && (
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="hint-button"
            onClick={() => void handleHint()}
          >
            Pedir dica
          </button>
        )}
        {attempt?.evaluation.pass && !isLastActivity && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="next-activity"
            onClick={handleNextActivity}
          >
            Próxima atividade
          </button>
        )}
        {attempt?.evaluation.pass && isLastActivity && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="finish-lesson"
            disabled={!requiredPassed || submitting}
            onClick={() => void handleFinish()}
          >
            {mode === "review" ? "Concluir revisão" : "Concluir lição"}
          </button>
        )}
      </div>
      <button type="button" className="btn btn-link" onClick={onExit}>
        {mode === "review" ? "Sair da revisão" : "Sair da lição"}
      </button>
    </section>
  );
}

function failedCheckIds(attempt: AttemptState): string[] {
  return attempt.evaluation.checks.filter((check) => !check.passed).map((check) => check.id);
}

function buildSummary(
  lesson: LessonDefinition,
  best: Record<string, AttemptState>,
  lessonScore: number,
  options: {
    mode: LessonMode;
    nextLessonId?: string;
    newlyUnlocked?: Achievement[];
  },
): LessonSummary {
  const activityResults: ActivityResultSummary[] = lesson.completion.requiredActivityIds
    .map((activityId) => best[activityId])
    .filter((state): state is AttemptState => state !== undefined)
    .map((state) => ({
      activityId: state.evaluation.activityId,
      pass: state.evaluation.pass,
      score: state.evaluation.score,
      feedback: state.feedback,
    }));
  return {
    lesson,
    lessonScore,
    activityResults,
    mode: options.mode,
    nextLessonId: options.nextLessonId,
    newlyUnlocked: options.newlyUnlocked,
  };
}
