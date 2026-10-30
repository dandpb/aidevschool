import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityResultSummary, LessonSummary } from "../app/App";
import { useServices } from "../app/services";
import { ActivityRenderer, isAnswerComplete } from "../components/ActivityRenderer";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { HintList } from "../components/HintList";
import { MentorGuide } from "../components/MentorGuide";
import { TabSafetyNotice } from "../components/TabSafetyNotice";
import { VoxelSkillArt } from "../components/VoxelSkillArt";
import { VoxelTaskArt, taskDetails } from "../components/VoxelTaskArt";
import type { LessonDefinition } from "../data/generated/lessons";
import {
  type AnalyticsActivityType,
  buildActivityPresentedEvent,
  buildLessonBriefViewedEvent,
} from "../domain/analytics";
import type { ActivityAnswer } from "../domain/evaluation";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import { FIRST_TOUCH_LEAD_IN, firstTouchPhrase } from "../domain/firstTouch";
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
import { RETROFIT_NOTICE_S2 } from "../domain/retrofitNotice";
import { findModule } from "../domain/track";
import { ErrorRecoveryScreen } from "./ErrorRecoveryScreen";

export type { LessonMode };

/**
 * Eventos de exposição encaminhados ao host em missão hospedada (F2 R2): o
 * sink literacy v2 permanece noop hospedado — `mission.brief_viewed` /
 * `activity.presented` chegam ao funil OS somente pelo protocolo
 * host-engine (sem segunda via; duplicação impossível por construção).
 */
export type MissionExposureEvents = {
  onBriefViewed: () => void;
  onActivityPresented: (activityType: AnalyticsActivityType, activityIndex: number) => void;
};

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
  replay = false,
  onboarding,
  retrofitNotice = false,
  reviewStage,
  missionEvents,
  hosted = false,
  mutationBlocked = false,
  onUncertainProgress,
  canMutate = () => true,
  onProgressChange,
  onCompleted,
  onExit,
}: {
  lessonId: string;
  mode?: LessonMode;
  replay?: boolean;
  onboarding: OnboardingState;
  /** Aviso S2 (retrofit O3-C1): exibido 1× por learner/lição/bump na intro. */
  retrofitNotice?: boolean;
  /** Estágio da revisão na abertura — 1 hop por sessão ao concluir (§4.4). */
  reviewStage?: number;
  /** Presente somente em missão hospedada (forwarding mission-event ao host). */
  missionEvents?: MissionExposureEvents;
  hosted?: boolean;
  mutationBlocked?: boolean;
  onUncertainProgress?: () => Promise<void>;
  canMutate?: () => boolean;
  onProgressChange: (progress: LearnerProgress) => void;
  onCompleted: (progress: LearnerProgress, summary: LessonSummary) => void;
  onExit: () => void;
}) {
  const services = useServices();
  const lesson = useMemo(() => services.content.getLesson(lessonId), [services, lessonId]);
  const module = lesson ? findModule(services.content.listModules(), lesson.moduleId) : undefined;

  const [session, setSession] = useState<LessonSession>(() => ({
    ...createLessonSession(lessonId, mode),
    onboarding,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [attemptError, setAttemptError] = useState(false);
  const [answerEdited, setAnswerEdited] = useState(false);
  const [attemptFailureCount, setAttemptFailureCount] = useState(0);
  const [recheckFocus, setRecheckFocus] = useState<{ passed: boolean } | null>(null);
  const [completionError, setCompletionError] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const hintBusy = useRef(false);
  const retryBusy = useRef(false);
  const submissionBusy = useRef(false);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);
  const preserveRetryFocus = useRef(false);
  const retryFocusCleanup = useRef<(() => void) | null>(null);
  const nextActionRef = useRef<HTMLButtonElement | null>(null);
  const restoreSubmitFocus = useRef(false);
  const preserveFeedbackFocus = useRef(false);
  const latestPassingEvidence = useRef<LiteracyEvidenceRecord>();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => retryFocusCleanup.current?.(), []);
  useEffect(() => {
    if (
      attemptFailureCount > 0 &&
      restoreSubmitFocus.current &&
      document.activeElement === document.body
    ) {
      submitButtonRef.current?.focus();
    }
  }, [attemptFailureCount]);
  useEffect(() => {
    if (
      recheckFocus &&
      restoreSubmitFocus.current &&
      !preserveFeedbackFocus.current &&
      document.activeElement === document.body
    ) {
      (recheckFocus.passed ? nextActionRef : feedbackRef).current?.focus();
    }
  }, [recheckFocus]);
  useEffect(() => {
    if (!submitting) return;
    const cancelFocusRestore = () => {
      restoreSubmitFocus.current = false;
      if (submissionBusy.current) preserveFeedbackFocus.current = true;
    };
    const cancelForScrollKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
        cancelFocusRestore();
      }
    };
    document.addEventListener("pointerdown", cancelFocusRestore);
    document.addEventListener("focusin", cancelFocusRestore);
    document.addEventListener("wheel", cancelFocusRestore, { passive: true });
    document.addEventListener("keydown", cancelForScrollKey);
    return () => {
      document.removeEventListener("pointerdown", cancelFocusRestore);
      document.removeEventListener("focusin", cancelFocusRestore);
      document.removeEventListener("wheel", cancelFocusRestore);
      document.removeEventListener("keydown", cancelForScrollKey);
    };
  }, [submitting]);
  // Exposição (F2 R2, emenda ADR-0009): brief 1× por mount (a intro não
  // retorna depois de "Começar missão") e `activity_presented` 1× por
  // (sessão, índice absoluto) — re-render/retry/navegação de volta não
  // reemitem índices já apresentados (guarda por Set).
  const briefViewedRef = useRef(false);
  const presentedActivityKeysRef = useRef<Set<string>>(new Set());
  // biome-ignore lint/correctness/useExhaustiveDependencies: mudança de atividade também requer foco, mesmo sem ler o índice.
  useEffect(() => {
    if (session.phase === "attempting" && preserveRetryFocus.current) {
      preserveRetryFocus.current = false;
      return;
    }
    if (session.phase === "feedback" && preserveFeedbackFocus.current) {
      preserveFeedbackFocus.current = false;
      return;
    }
    preserveFeedbackFocus.current = false;
    if (session.phase === "feedback" && feedbackRef.current) {
      feedbackRef.current.focus();
    } else {
      headingRef.current?.focus();
    }
  }, [session.phase, session.currentActivityIndex]);
  useEffect(() => {
    if (!lesson) return;
    const identity = {
      sessionId: services.analyticsIdentity.sessionId,
      eventId: services.analyticsIdentity.nextEventId(),
    };
    const timing = {
      occurredAt: services.clock().toISOString(),
      contentVersion: services.content.getContentVersion(),
    };
    if (session.phase === "intro") {
      if (!briefViewedRef.current) {
        briefViewedRef.current = true;
        services.analytics.track(
          buildLessonBriefViewedEvent(
            identity,
            { lessonId: lesson.id, lessonVersion: lesson.version },
            timing,
          ),
        );
        missionEvents?.onBriefViewed();
      }
      return;
    }
    if (session.phase === "completed") return;
    const index = session.currentActivityIndex;
    const activity = lesson.activities[index];
    if (activity === undefined) return;
    const key = `${lesson.id}:${index}`;
    if (presentedActivityKeysRef.current.has(key)) return;
    presentedActivityKeysRef.current.add(key);
    services.analytics.track(
      buildActivityPresentedEvent(
        identity,
        { lessonId: lesson.id, activityType: activity.type, activityIndex: index },
        timing,
      ),
    );
    missionEvents?.onActivityPresented(activity.type, index);
  }, [session.phase, session.currentActivityIndex, lesson, services, missionEvents]);

  if (!lesson) {
    return (
      <ErrorRecoveryScreen
        message="Lição não encontrada."
        onBack={hosted ? undefined : onExit}
        hosted={hosted}
      />
    );
  }

  const activity = currentActivity(session, lesson);

  if (!activity) {
    return (
      <ErrorRecoveryScreen
        message="Nenhuma atividade encontrada para esta lição."
        onBack={hosted ? undefined : onExit}
        hosted={hosted}
      />
    );
  }

  const answer = currentAnswer(session, activity);
  const attempt = latestAttempt(session, activity.id);
  const hints = hintsFor(session, activity.id);
  const hintCount = services.feedback.hintCount(activity);
  const hasMoreHints = hintCount > hints.index;
  const lastActivity = isLastActivity(session, lesson);
  const requiredPassed = requiredActivitiesPassed(session, lesson.completion.requiredActivityIds);

  const applyTransition = (result: { session: LessonSession; finishPayload?: FinishPayload }) => {
    if (result.finishPayload) {
      void handleFinish(result.finishPayload);
    } else {
      setSession(result.session);
    }
  };

  const updateAnswer = (next: ActivityAnswer) => {
    if (!canMutate() || attempt?.evaluation.pass) return;
    if (attempt && !attempt.evaluation.pass) setAnswerEdited(true);
    setSession((previous) => setAnswer(previous, lesson, next));
  };

  const handleStart = () => {
    if (!canMutate()) return;
    applyTransition({ session: startSession(session, services.clock()) });
  };

  const handleSubmit = async () => {
    if (
      !canMutate() ||
      submissionBusy.current ||
      hintBusy.current ||
      retryBusy.current ||
      !activity
    )
      return;
    const isRecheck = session.phase === "feedback" && attempt?.evaluation.pass === false;
    restoreSubmitFocus.current = document.activeElement === submitButtonRef.current;
    preserveFeedbackFocus.current = false;
    submissionBusy.current = true;
    setSubmitting(true);
    setAttemptError(false);
    setRetryError(false);
    try {
      const result = await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer,
        context: mode,
        deferReviewSchedule: mode === "review",
      });
      applyTransition({
        session: submitAttempt(session, lesson, result.evaluation, result.feedback),
      });
      setAnswerEdited(false);
      if (result.evaluation.pass) latestPassingEvidence.current = result.record;
      if (isRecheck) setRecheckFocus({ passed: result.evaluation.pass });
      onProgressChange(result.progress);
    } catch {
      setAttemptError(true);
      await onUncertainProgress?.();
      setAttemptFailureCount((count) => count + 1);
    } finally {
      submissionBusy.current = false;
      setSubmitting(false);
    }
  };

  const handleHint = async () => {
    if (
      !canMutate() ||
      !activity ||
      !hasMoreHints ||
      submissionBusy.current ||
      hintBusy.current ||
      retryBusy.current
    )
      return;
    hintBusy.current = true;
    setHintLoading(true);
    setHintError(false);
    setRetryError(false);
    try {
      const result = await services.useCases.requestHint({
        lessonId: lesson.id,
        activityId: activity.id,
        hintIndex: hints.index,
      });
      applyTransition({ session: recordHint(session, lesson, result.hint) });
    } catch {
      setHintError(true);
    } finally {
      hintBusy.current = false;
      setHintLoading(false);
    }
  };

  const handleRetry = async () => {
    if (
      !canMutate() ||
      !activity ||
      submissionBusy.current ||
      hintBusy.current ||
      retryBusy.current
    )
      return;
    retryBusy.current = true;
    setRetryLoading(true);
    setRetryError(false);
    let interacted = false;
    const cancelFocus = () => {
      interacted = true;
    };
    const cancelForScrollKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
        cancelFocus();
      }
    };
    document.addEventListener("pointerdown", cancelFocus);
    document.addEventListener("focusin", cancelFocus);
    document.addEventListener("wheel", cancelFocus, { passive: true });
    document.addEventListener("keydown", cancelForScrollKey);
    const cleanupFocusListeners = () => {
      document.removeEventListener("pointerdown", cancelFocus);
      document.removeEventListener("focusin", cancelFocus);
      document.removeEventListener("wheel", cancelFocus);
      document.removeEventListener("keydown", cancelForScrollKey);
      if (retryFocusCleanup.current === cleanupFocusListeners) retryFocusCleanup.current = null;
    };
    retryFocusCleanup.current = cleanupFocusListeners;
    try {
      await services.useCases.retryActivity({ lessonId: lesson.id, activityId: activity.id });
      preserveRetryFocus.current = interacted || document.activeElement !== retryButtonRef.current;
      setAttemptError(false);
      setHintError(false);
      setAnswerEdited(false);
      applyTransition({ session: retryCurrentActivity(session, lesson) });
    } catch {
      setRetryError(true);
    } finally {
      cleanupFocusListeners();
      retryBusy.current = false;
      setRetryLoading(false);
    }
    // AID-1089/W2 (state contract §2.3, preservação de foco no retry): o botão
    // "Tentar novamente" desmonta quando a tentativa é limpa; o efeito de fase
    // (feedback→attempting) já refoca o heading tabIndex=-1 — o comportamento
    // é travado por tests/app/lessonStateContract.test.tsx como contrato.
  };

  const handleNextActivity = () => {
    setAnswerEdited(false);
    setHintError(false);
    setRetryError(false);
    applyTransition({ session: nextActivity(session, lesson) });
  };

  const handleFinish = async (payload: FinishPayload) => {
    if (!canMutate() || submissionBusy.current || hintBusy.current || retryBusy.current) return;
    submissionBusy.current = true;
    setSubmitting(true);
    setCompleting(true);
    setCompletionError(false);
    try {
      if (mode === "review") {
        const result = await services.useCases.completeReview({
          lessonId: lesson.id,
          bestScores: payload.bestScores,
          intervalIndex: reviewStage === undefined ? undefined : reviewStage + 1,
        });
        if (!result.outcome.completed) {
          setCompletionError(true);
          return;
        }
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
      if (!result.outcome.completed) {
        setCompletionError(true);
        return;
      }
      const summary = buildSummary(lesson, session.best, result.outcome.lessonScore, {
        mode,
        replay,
        nextLessonId: result.nextLessonId,
        newlyUnlocked: result.newlyUnlocked,
        evidenceRecord: latestPassingEvidence.current,
      });
      onCompleted(result.progress, summary);
    } catch {
      setCompletionError(true);
      await onUncertainProgress?.();
    } finally {
      submissionBusy.current = false;
      setSubmitting(false);
      setCompleting(false);
    }
  };

  if (session.phase === "intro") {
    const taskCategory = onboarding?.taskCategory;
    const showMapContext = mode === "initial" && lesson.id === MAP_INITIAL_LESSON_ID;
    const entryHint =
      showMapContext && onboarding?.confidence === "low"
        ? lesson.activities[0]?.hints?.[0]
        : undefined;
    // F1 R1 (first-touch): frase derivada do activities[0].type canônico via
    // mapa fechado — sem hardcode por lição; modo revisão herda a mesma frase
    // (mesma tela, sem bifurcação de copy); missão hospedada herda pelo adapter.
    const firstTouch =
      lesson.activities[0] !== undefined ? firstTouchPhrase(lesson.activities[0].type) : undefined;
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
              ? "Repetir é o que fixa: refaça as atividades desta lição para manter o conteúdo vivo. A revisão não muda seu progresso na trilha."
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
        {retrofitNotice && (
          <p className="muted" data-testid="retrofit-notice-s2">
            {RETROFIT_NOTICE_S2}
          </p>
        )}
        {firstTouch !== undefined && (
          <p className="first-touch" data-testid="first-touch">
            <strong>{FIRST_TOUCH_LEAD_IN}</strong> {firstTouch}
          </p>
        )}
        <p className="muted" data-testid="session-continuity">
          <strong>Se precisar parar:</strong> ao sair ou recarregar, as respostas da missão e a
          etapa atual não são recuperadas. O progresso já registrado fica neste navegador.{" "}
          <TabSafetyNotice />
        </p>
        <button
          type="button"
          className="btn btn-primary"
          data-testid="start-lesson"
          disabled={mutationBlocked}
          onClick={handleStart}
        >
          {mode === "review" ? "Começar revisão" : "Começar missão"}
        </button>
        {hosted ? (
          <p className="muted">Para sair, use a navegação do aplicativo que abriu esta missão.</p>
        ) : (
          <button type="button" className="btn btn-link" onClick={onExit}>
            {mode === "review" ? "Sair da revisão" : "Sair da lição"}
          </button>
        )}
      </section>
    );
  }

  if (!activity) {
    return (
      <section className="screen">
        <p role="alert">Nenhuma atividade encontrada para esta lição.</p>
        {hosted ? (
          <p className="muted">Para sair, use a navegação do aplicativo que abriu esta missão.</p>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            Voltar
          </button>
        )}
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
        {currentIndex === 0 && (
          <>
            {" · "}
            <span data-testid="first-activity-framing">
              Primeira atividade — tente com o que você sabe; se travar, peça uma dica
            </span>
          </>
        )}
      </p>
      <h1 id="activity-heading" className="activity-instruction" ref={headingRef} tabIndex={-1}>
        {activity.instruction}
      </h1>

      <VoxelSkillArt skillId={lesson.skillIds[0]} />

      <ActivityRenderer
        activity={activity}
        answer={answer}
        invalidIds={
          attempt && !attempt.evaluation.pass && !answerEdited ? failedCheckIds(attempt) : []
        }
        disabled={submitting || hintLoading || retryLoading || mutationBlocked}
        answerLocked={attempt?.evaluation.pass === true}
        onChange={updateAnswer}
      />

      {attempt && (
        <FeedbackPanel
          feedback={attempt.feedback}
          hintsShown={hints.shown}
          focusRef={feedbackRef}
        />
      )}
      {attempt?.evaluation.pass && (
        <p className="muted">Resposta aprovada. Continue pela próxima ação.</p>
      )}
      <div aria-live="polite">
        {attempt && answerEdited && (
          <p className="muted" data-testid="prior-feedback-note">
            Você está editando a resposta; o feedback acima é da tentativa anterior.
          </p>
        )}
      </div>
      {!attempt && (
        <div aria-live="polite" aria-atomic="true">
          <HintList hints={hints.shown} />
        </div>
      )}

      {attemptError && (
        <p className="feedback feedback-fail" role="alert">
          Não foi possível confirmar o resultado. Ao tentar novamente, a tentativa anterior pode já
          ter sido registrada.
        </p>
      )}
      {hintError && (
        <p className="feedback feedback-fail" role="alert">
          Não foi possível carregar a dica. Tente novamente.
        </p>
      )}
      {retryError && (
        <p className="feedback feedback-fail" role="alert">
          Não foi possível reiniciar a tentativa. Tente novamente.
        </p>
      )}
      {completionError && (
        <p className="feedback feedback-fail" role="alert">
          Não foi possível confirmar a conclusão. Ela pode já ter sido registrada. Ao recarregar, o
          aplicativo tenta abrir o progresso salvo, mas as respostas desta sessão serão perdidas.
        </p>
      )}

      {/* AID-1089/W2 (state contract §2.3-6): região role=status do loading —
          a ação assíncrona desabilita o controle e anuncia o andamento.
          <output> carrega role=status implícito (biome useSemanticElements). */}
      {submitting && (
        <output className="sr-only" data-testid="lesson-busy">
          {completing ? "Registrando conclusão…" : "Verificando sua resposta…"}
        </output>
      )}
      {hintLoading && (
        <output className="sr-only" data-testid="hint-busy">
          Buscando dica…
        </output>
      )}
      {retryLoading && (
        <output className="sr-only" data-testid="retry-busy">
          Reiniciando tentativa…
        </output>
      )}

      <div className="actions">
        {!attempt?.evaluation.pass && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="submit-attempt"
            ref={submitButtonRef}
            disabled={
              !isAnswerComplete(activity, answer) ||
              submitting ||
              hintLoading ||
              retryLoading ||
              mutationBlocked
            }
            aria-busy={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Verificando…" : attempt ? "Verificar de novo" : "Verificar resposta"}
          </button>
        )}
        {attempt && !attempt.evaluation.pass && (
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="retry-activity"
            ref={retryButtonRef}
            aria-disabled={submitting || hintLoading || retryLoading || mutationBlocked}
            aria-busy={retryLoading}
            onClick={() => void handleRetry()}
          >
            {retryLoading ? "Reiniciando…" : "Tentar novamente"}
          </button>
        )}
        {hintCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="hint-button"
            aria-disabled={
              !hasMoreHints || submitting || hintLoading || retryLoading || mutationBlocked
            }
            aria-busy={hintLoading}
            onClick={() => void handleHint()}
          >
            {hintLoading
              ? "Buscando dica…"
              : hasMoreHints
                ? "Pedir dica"
                : "Todas as dicas exibidas"}
          </button>
        )}
        {attempt?.evaluation.pass && !lastActivity && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="next-activity"
            ref={nextActionRef}
            disabled={submitting || hintLoading || retryLoading || mutationBlocked}
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
            ref={nextActionRef}
            aria-disabled={
              !requiredPassed || submitting || hintLoading || retryLoading || mutationBlocked
            }
            aria-busy={submitting}
            onClick={() => {
              if (
                !requiredPassed ||
                !canMutate() ||
                submissionBusy.current ||
                hintBusy.current ||
                retryBusy.current
              )
                return;
              applyTransition(finishLesson(session, lesson, services.clock()));
            }}
          >
            {completing
              ? "Registrando conclusão…"
              : mode === "review"
                ? "Concluir revisão"
                : "Concluir lição"}
          </button>
        )}
      </div>
      {hosted ? (
        <p className="muted">Para sair, use a navegação do aplicativo que abriu esta missão.</p>
      ) : (
        <button
          type="button"
          className="btn btn-link"
          aria-disabled={submitting || hintLoading || retryLoading}
          onClick={() => {
            if (!submissionBusy.current && !hintBusy.current && !retryBusy.current) onExit();
          }}
        >
          {mode === "review" ? "Sair da revisão" : "Sair da lição"}
        </button>
      )}
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
    replay?: boolean;
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
    replay: options.replay,
    nextLessonId: options.nextLessonId,
    newlyUnlocked: options.newlyUnlocked,
    evidenceRecord: options.evidenceRecord,
  };
}
