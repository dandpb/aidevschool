import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityResultSummary, LessonSummary } from "../app/App";
import { useServices } from "../app/services";
import { ActivityRenderer, isAnswerComplete } from "../components/ActivityRenderer";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { MentorGuide } from "../components/MentorGuide";
import { VoxelSkillArt } from "../components/VoxelSkillArt";
import { VoxelTaskArt, taskDetails } from "../components/VoxelTaskArt";
import type { LessonDefinition } from "../data/generated/lessons";
import type { ActivityAnswer } from "../domain/evaluation";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import {
  type AttemptState,
  type FinishPayload,
  type LessonMode,
  type LessonSession,
  createLessonSession,
  currentActivity,
  currentAnswer,
  finishLesson,
  hintsFor,
  isLastActivity,
  latestAttempt,
  nextActivity,
  recordHint,
  requiredActivitiesPassed,
  retryCurrentActivity,
  setAnswer,
  startSession,
  submitAttempt,
} from "../domain/lessonSession";
import {
  type Achievement,
  type LearnerProgress,
  MAP_INITIAL_LESSON_ID,
  type OnboardingState,
} from "../domain/progress";
import { findModule } from "../domain/track";

export type { LessonMode };

/**
 * Player de lição (plano seção 9): uma ideia por tela — introdução curta com a
 * situação, tentativa antes da explicação completa, feedback acionável
 * ("ainda falta X") e tentar novamente. Modo "review" (Fase 2): re-executa as
 * atividades de uma lição concluída como revisão espaçada, emitindo evidência
 * com contexto de revisão. Respostas são transitórias: recarregar retoma no
 * início da lição em andamento (ver resumeSession).
 *
 * O estado local da sessão foi extraído para lessonSession.ts: a tela apenas
 * renderiza o estado e despacha comandos puros.
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

  const [onboarding, setOnboarding] = useState<OnboardingState>();
  const [session, setSession] = useState<LessonSession>(() => createLessonSession(lessonId, mode));
  const [submitting, setSubmitting] = useState(false);
  const latestPassingEvidence = useRef<LiteracyEvidenceRecord>();
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Abertura da lição (status in_progress + lesson_started) ou da revisão (review_started).
  useEffect(() => {
    let cancelled = false;
    const opening =
      mode === "review"
        ? services.useCases.startReview(lessonId).then((result) => result.progress)
        : services.useCases.startLesson(lessonId);
    void opening.then((progress) => {
      if (!cancelled) {
        setOnboarding(progress.onboarding);
        setSession((previous) => ({ ...previous, onboarding: progress.onboarding }));
        onProgressChange(progress);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [services, lessonId, mode, onProgressChange]);

  // Gerenciamento de foco: o título recebe foco a cada nova tela do player
  // (introdução e cada atividade), orientando teclado e leitor de tela.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o efeito deve re-executar a cada mudança de fase/atividade (phase/currentActivityIndex), embora não leia o valor.
  useEffect(() => {
    headingRef.current?.focus();
  }, [session.phase, session.currentActivityIndex]);

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

  const activity = currentActivity(session, lesson);

  if (!activity) {
    return (
      <section className="screen">
        <p role="alert">Nenhuma atividade encontrada para esta lição.</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Voltar
        </button>
      </section>
    );
  }

  const answer = currentAnswer(session, activity);
  const attempt = latestAttempt(session, activity.id);
  const hints = hintsFor(session, activity.id);
  const hasMoreHints = services.feedback.hintCount(activity) > hints.index;
  const lastActivity = isLastActivity(session, lesson);
  const requiredPassed = requiredActivitiesPassed(session, lesson.completion.requiredActivityIds);

  const applyTransition = (result: { session: LessonSession; finishPayload?: FinishPayload }) => {
    setSession(result.session);
    if (result.finishPayload) {
      void handleFinish(result.finishPayload);
    }
  };

  const updateAnswer = (next: ActivityAnswer) => {
    setSession((previous) => setAnswer(previous, lesson, next));
  };

  const handleStart = () => {
    applyTransition({ session: startSession(session, services.clock()) });
  };

  const handleSubmit = async () => {
    if (submitting || !activity) return;
    setSubmitting(true);
    try {
      const result = await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer,
        context: mode,
      });
      applyTransition({
        session: submitAttempt(session, lesson, result.evaluation, result.feedback),
      });
      if (result.evaluation.pass) latestPassingEvidence.current = result.record;
      onProgressChange(result.progress);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHint = async () => {
    if (!activity) return;
    const result = await services.useCases.requestHint({
      lessonId: lesson.id,
      activityId: activity.id,
      hintIndex: hints.index,
    });
    applyTransition({ session: recordHint(session, lesson, result.hint) });
  };

  const handleRetry = async () => {
    if (!activity) return;
    await services.useCases.retryActivity({ lessonId: lesson.id, activityId: activity.id });
    applyTransition({ session: retryCurrentActivity(session, lesson) });
  };

  const handleNextActivity = () => {
    applyTransition({ session: nextActivity(session, lesson) });
  };

  const handleFinish = async (payload: FinishPayload) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "review") {
        const result = await services.useCases.completeReview({
          lessonId: lesson.id,
          bestScores: payload.bestScores,
        });
        if (!result.outcome.completed) return;
        const summary = buildSummary(lesson, session.best, result.outcome.lessonScore, {
          mode,
          evidenceRecord: latestPassingEvidence.current,
        });
        onCompleted(result.progress, summary);
        return;
      }
      const result = await services.useCases.completeLesson({
        lessonId: lesson.id,
        bestScores: payload.bestScores,
        durationSeconds: payload.durationSeconds,
      });
      if (!result.outcome.completed) return;
      const summary = buildSummary(lesson, session.best, result.outcome.lessonScore, {
        mode,
        nextLessonId: result.nextLessonId,
        newlyUnlocked: result.newlyUnlocked,
        evidenceRecord: latestPassingEvidence.current,
      });
      onCompleted(result.progress, summary);
    } finally {
      setSubmitting(false);
    }
  };

  if (session.phase === "intro") {
    const taskCategory = onboarding?.taskCategory;
    const showMapContext = mode === "initial" && lesson.id === MAP_INITIAL_LESSON_ID;
    const entryHint =
      showMapContext && onboarding?.confidence === "low"
        ? lesson.activities[0]?.hints?.[0]
        : undefined;
    return (
      <section
        className="screen lesson-intro-screen"
        data-testid="lesson-intro"
        aria-labelledby="lesson-title"
      >
        {module && <p className="eyebrow">MISSÃO DA VILA · {module.title}</p>}
        <h1 id="lesson-title" ref={headingRef} tabIndex={-1}>
          {mode === "review" ? `Revisão: ${lesson.title}` : lesson.title}
        </h1>
        <p className="muted">
          {lesson.estimatedMinutes} min ·{" "}
          {lesson.skillIds.map((id) => services.content.getSkillTitle(id)).join(", ")}
        </p>
        <div className="card village-request" data-testid="village-request">
          <h2>{mode === "review" ? "Hora de revisar" : "Pedido da Vila Lume"}</h2>
          <p>
            {mode === "review"
              ? "Repetir é o que fixa: refaça a atividade desta lição para manter o conteúdo vivo. A revisão não muda seu progresso na trilha."
              : lesson.objective}
          </p>
          <VoxelSkillArt skillId={lesson.skillIds[0]} />
        </div>
        <ol className="village-loop" aria-label="Ciclo da missão em Vila Lume">
          <li>Entender</li>
          <li>Escolher</li>
          <li>Conferir</li>
          <li>Aplicar</li>
        </ol>
        {showMapContext && taskCategory && (
          <div className="card task-context" data-testid="task-context">
            <VoxelTaskArt category={taskCategory} />
            <div>
              <h2>Aplicação que você escolheu: {taskDetails(taskCategory).label}</h2>
              <p>{taskDetails(taskCategory).guidance}</p>
            </div>
          </div>
        )}
        <MentorGuide
          compact
          eyebrow={mode === "review" ? "REVISÃO GUIADA" : "DICA DA LUMI"}
          title={entryHint ? "Comece com calma" : "Uma missão de cada vez"}
          testId={entryHint ? "confidence-support" : "lesson-guide"}
        >
          <p>
            {entryHint
              ? `Dica de partida: ${entryHint}`
              : "Tente com o que você já sabe. Se travar, peça uma dica — ela ajuda sem entregar a resposta."}
          </p>
        </MentorGuide>
        <button
          type="button"
          className="btn btn-primary"
          data-testid="start-lesson"
          onClick={handleStart}
        >
          {mode === "review" ? "Começar revisão" : "Começar missão"}
        </button>
        <button type="button" className="btn btn-link" onClick={onExit}>
          {mode === "review" ? "Sair da revisão" : "Sair da lição"}
        </button>
      </section>
    );
  }

  if (!activity) {
    return (
      <section className="screen">
        <p role="alert">Nenhuma atividade encontrada para esta lição.</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Voltar
        </button>
      </section>
    );
  }

  const currentIndex = session.currentActivityIndex;
  const activities = lesson.activities;

  return (
    <section className="screen" data-testid="lesson-player" aria-labelledby="activity-heading">
      <p className="eyebrow">
        VILA LUME · {mode === "review" ? "Revisão · " : ""}
        {lesson.title} · atividade {currentIndex + 1} de {activities.length}
      </p>
      <h1 id="activity-heading" className="activity-instruction" ref={headingRef} tabIndex={-1}>
        {activity.instruction}
      </h1>

      <VoxelSkillArt skillId={lesson.skillIds[0]} />

      <ActivityRenderer
        activity={activity}
        answer={answer}
        invalidIds={attempt && !attempt.evaluation.pass ? failedCheckIds(attempt) : []}
        disabled={false}
        onChange={updateAnswer}
      />

      {attempt && <FeedbackPanel feedback={attempt.feedback} hintsShown={hints.shown} />}

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
        {attempt?.evaluation.pass && !lastActivity && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="next-activity"
            onClick={handleNextActivity}
          >
            Próxima atividade
          </button>
        )}
        {attempt?.evaluation.pass && lastActivity && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="finish-lesson"
            disabled={!requiredPassed || submitting}
            onClick={() => void applyTransition(finishLesson(session, lesson, services.clock()))}
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
    evidenceRecord?: LiteracyEvidenceRecord;
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
    evidenceRecord: options.evidenceRecord,
  };
}
