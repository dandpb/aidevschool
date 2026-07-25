import type { ActivityDefinition, LessonDefinition } from "../data/generated/lessons";
import { type ActivityAnswer, type EvaluationResult, evaluateActivity } from "../domain/evaluation";
import { type LiteracyEvidenceRecord, buildEvidenceRecord } from "../domain/evidence";
import type { AttemptFeedback } from "../domain/feedback";
import {
  type Achievement,
  type AudienceChoice,
  type LearnerProgress,
  type LessonOutcome,
  MAP_INITIAL_LESSON_ID,
  type OnboardingConfidence,
  type OnboardingContext,
  type OnboardingGoal,
  type OnboardingTaskCategory,
  type SkillPractice,
  applyAchievements,
  completeLesson as completeLessonInDomain,
  completeOnboarding,
  evaluateLessonCompletion,
  isLessonUnlocked,
  recordActivityAttempt,
  recordApplication,
  recordMapInitialHintRequest,
  recordMapInitialRetry,
  reviewsDue,
  scheduleReviewForLesson,
  startLesson as startLessonInDomain,
} from "../domain/progress";
import type {
  AnalyticsSink,
  Clock,
  ContentRepository,
  EvidenceSink,
  FeedbackProvider,
  ProgressRepository,
} from "./ports";

/**
 * Casos de uso do vertical slice (plano seção 8): startLesson,
 * submitActivityAttempt, requestHint, retryActivity, completeLesson,
 * scheduleReview, resumeSession, resetProgress (+ completeOnboarding).
 */

export class LessonNotFoundError extends Error {
  constructor(lessonId: string) {
    super(`Lição não encontrada no read model: ${lessonId}`);
    this.name = "LessonNotFoundError";
  }
}

export class LessonLockedError extends Error {
  constructor(lessonId: string) {
    super(`Lição bloqueada ou sem conteúdo: ${lessonId}`);
    this.name = "LessonLockedError";
  }
}

export class ActivityNotFoundError extends Error {
  constructor(activityId: string) {
    super(`Atividade não encontrada: ${activityId}`);
    this.name = "ActivityNotFoundError";
  }
}

export class ProgressNotInitializedError extends Error {
  constructor() {
    super("Progresso não inicializado — o boot do app deve semear o estado inicial");
    this.name = "ProgressNotInitializedError";
  }
}

export type UseCaseDeps = {
  content: ContentRepository;
  progress: ProgressRepository;
  evidence: EvidenceSink;
  feedback: FeedbackProvider;
  analytics: AnalyticsSink;
  clock: Clock;
};

export type SubmitAttemptResult = {
  progress: LearnerProgress;
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
  record: LiteracyEvidenceRecord;
};

export type CompleteLessonResult = {
  progress: LearnerProgress;
  outcome: LessonOutcome;
  nextLessonId?: string;
  newlyUnlocked?: Achievement[];
};

export type ResumeDestination =
  | { kind: "onboarding" }
  | { kind: "home" }
  | { kind: "lesson"; lessonId: string };

export class LiteracyUseCases {
  constructor(private readonly deps: UseCaseDeps) {}

  private requireLesson(lessonId: string): LessonDefinition {
    const lesson = this.deps.content.getLesson(lessonId);
    if (!lesson) throw new LessonNotFoundError(lessonId);
    return lesson;
  }

  private requireActivity(lesson: LessonDefinition, activityId: string): ActivityDefinition {
    const activity = lesson.activities.find((item) => item.id === activityId);
    if (!activity) throw new ActivityNotFoundError(activityId);
    return activity;
  }

  private async requireProgress(): Promise<LearnerProgress> {
    const progress = await this.deps.progress.load();
    if (!progress) throw new ProgressNotInitializedError();
    return progress;
  }

  async completeOnboarding(input: {
    goal: OnboardingGoal;
    context: OnboardingContext;
    confidence: OnboardingConfidence;
    taskCategory: OnboardingTaskCategory;
    audience: AudienceChoice;
  }): Promise<LearnerProgress> {
    const progress = await this.requireProgress();
    const next = completeOnboarding(progress, input);
    await this.deps.progress.save(next);
    this.deps.analytics.track("onboarding_completed", { context: input.context });
    return next;
  }

  async startLesson(lessonId: string): Promise<LearnerProgress> {
    const lesson = this.requireLesson(lessonId);
    const progress = await this.requireProgress();
    if (!isLessonUnlocked(progress, lessonId)) throw new LessonLockedError(lessonId);
    const next = startLessonInDomain(progress, lessonId);
    await this.deps.progress.save(next);
    this.deps.analytics.track("lesson_started", {
      lessonId,
      lessonVersion: lesson.version,
    });
    return next;
  }

  async submitActivityAttempt(input: {
    lessonId: string;
    activityId: string;
    answer: ActivityAnswer;
    /** "review" quando a tentativa faz parte de uma revisão espaçada. */
    context?: "initial" | "review";
  }): Promise<SubmitAttemptResult> {
    const lesson = this.requireLesson(input.lessonId);
    const activity = this.requireActivity(lesson, input.activityId);
    const evaluation = evaluateActivity(activity, input.answer);

    const progress = await this.requireProgress();
    const now = this.deps.clock.now();
    const next = recordActivityAttempt(progress, {
      lessonId: lesson.id,
      evaluation,
      skillIds: lesson.skillIds,
      intervalsDays: lesson.review.intervalsDays,
      now,
    });
    await this.deps.progress.save(next);

    const record = buildEvidenceRecord({
      attemptId: `att-${String(next.counters.attempts).padStart(6, "0")}`,
      lessonId: lesson.id,
      lessonVersion: lesson.version,
      skillIds: [...lesson.skillIds],
      evaluation,
      timestamp: now.toISOString(),
      context: input.context ?? "initial",
    });
    this.deps.evidence.emit(record);

    this.deps.analytics.track("activity_attempted", {
      activityId: activity.id,
      activityType: activity.type,
      pass: evaluation.pass,
      score: evaluation.score,
    });
    if (evaluation.pass) {
      this.deps.analytics.track("activity_passed", {
        activityId: activity.id,
        score: evaluation.score,
      });
    }

    return {
      progress: next,
      evaluation,
      feedback: this.deps.feedback.feedbackFor(activity, evaluation),
      record,
    };
  }

  async requestHint(input: {
    lessonId: string;
    activityId: string;
    hintIndex: number;
  }): Promise<{ hint: string | null; nextIndex: number }> {
    const lesson = this.requireLesson(input.lessonId);
    const activity = this.requireActivity(lesson, input.activityId);
    const hint = this.deps.feedback.hintFor(activity, input.hintIndex);
    let progress = await this.requireProgress();
    if (input.lessonId === MAP_INITIAL_LESSON_ID) {
      progress = recordMapInitialHintRequest(progress);
      await this.deps.progress.save(progress);
    }
    this.deps.analytics.track("hint_requested", {
      activityId: activity.id,
      hintIndex: input.hintIndex,
    });
    return { hint, nextIndex: input.hintIndex + 1 };
  }

  /**
   * Tentar novamente: as respostas são transitórias por decisão de privacidade
   * (storage.policy), então o caso de uso não apaga estado persistido — ele
   * registra a intenção e a UI limpa a resposta local.
   */
  async retryActivity(input: { lessonId: string; activityId: string }): Promise<void> {
    const lesson = this.requireLesson(input.lessonId);
    const activity = this.requireActivity(lesson, input.activityId);
    if (input.lessonId === MAP_INITIAL_LESSON_ID) {
      const progress = await this.requireProgress();
      const next = recordMapInitialRetry(progress);
      await this.deps.progress.save(next);
    }
    this.deps.analytics.track("activity_retried", { activityId: activity.id });
  }

  async completeLesson(input: {
    lessonId: string;
    bestScores: Record<string, number>;
    durationSeconds?: number;
  }): Promise<CompleteLessonResult> {
    const lesson = this.requireLesson(input.lessonId);
    const progress = await this.requireProgress();
    const result = completeLessonInDomain(
      progress,
      lesson,
      input.bestScores,
      this.deps.content.listModules(),
      this.deps.clock.now(),
    );
    if (!result.outcome.completed) {
      return result;
    }
    await this.deps.progress.save(result.progress);
    this.deps.analytics.track("lesson_completed", {
      lessonId: input.lessonId,
      score: result.outcome.lessonScore,
      durationSeconds: input.durationSeconds,
    });
    return result;
  }

  /**
   * Início de uma revisão espaçada: a lição precisa estar concluída. Não muda
   * status nem concede XP — apenas registra o evento e devolve o contexto.
   */
  async startReview(
    lessonId: string,
  ): Promise<{ progress: LearnerProgress; intervalDays: number }> {
    const lesson = this.requireLesson(lessonId);
    const progress = await this.requireProgress();
    if (progress.lessonStatus[lessonId] !== "completed") {
      throw new LessonLockedError(lessonId);
    }
    const bestPasses = Math.max(
      0,
      ...lesson.skillIds.map((skillId) => (progress.skills[skillId]?.passes ?? 1) - 1),
    );
    const stage = Math.min(lesson.review.intervalsDays.length - 1, bestPasses);
    const intervalDays = lesson.review.intervalsDays[stage] ?? 1;
    this.deps.analytics.track("review_started", { lessonId, intervalDays });
    return { progress, intervalDays };
  }

  /**
   * Conclusão de uma revisão espaçada: sem XP de lição e sem desbloqueio; a
   * agenda seguinte já foi avançada pelas próprias tentativas (passes → estágio).
   */
  async completeReview(input: {
    lessonId: string;
    bestScores: Record<string, number>;
  }): Promise<CompleteLessonResult> {
    const lesson = this.requireLesson(input.lessonId);
    const outcome = evaluateLessonCompletion(lesson, input.bestScores);
    const progress = await this.requireProgress();
    this.deps.analytics.track("review_completed", {
      lessonId: input.lessonId,
      score: outcome.lessonScore,
    });
    return { progress, outcome };
  }

  /** Relato de aplicação real (sem texto livre): registra, emite evento e avalia conquistas. */
  async reportRealWorldApplication(input: {
    lessonId: string;
  }): Promise<{ progress: LearnerProgress; newlyUnlocked: Achievement[] }> {
    this.requireLesson(input.lessonId);
    const progress = await this.requireProgress();
    const now = this.deps.clock.now();
    let next = recordApplication(progress, input.lessonId, now);
    const withAchievements = applyAchievements(next, this.deps.content.listModules(), now);
    next = withAchievements.progress;
    await this.deps.progress.save(next);
    this.deps.analytics.track("real_world_application_reported", { lessonId: input.lessonId });
    return { progress: next, newlyUnlocked: withAchievements.newlyUnlocked };
  }

  /**
   * Agenda (ou reagenda) a revisão espaçada das skills da lição.
   * intervalIndex: estágio dentro de review.intervalsDays (com clamp no último).
   */
  async scheduleReview(input: {
    lessonId: string;
    intervalIndex?: number;
  }): Promise<LearnerProgress> {
    const lesson = this.requireLesson(input.lessonId);
    const progress = await this.requireProgress();
    const next = scheduleReviewForLesson(
      progress,
      lesson,
      this.deps.clock.now(),
      input.intervalIndex ?? 0,
    );
    await this.deps.progress.save(next);
    return next;
  }

  /** Carrega o progresso bruto (read-only) para consumo de queries e telas. */
  async loadProgress(): Promise<LearnerProgress | null> {
    return this.deps.progress.load();
  }

  /** Ponto de retomada após reload: onboarding pendente → onboarding; lição em andamento → player; senão → home. */
  async resumeSession(): Promise<ResumeDestination> {
    const progress = await this.deps.progress.load();
    if (!progress || !progress.onboarding.completed) return { kind: "onboarding" };
    const current = progress.currentLessonId;
    if (current && progress.lessonStatus[current] === "in_progress") {
      return { kind: "lesson", lessonId: current };
    }
    return { kind: "home" };
  }

  async pendingReviews(): Promise<SkillPractice[]> {
    const progress = await this.requireProgress();
    return reviewsDue(progress, this.deps.clock.now());
  }

  async resetProgress(): Promise<void> {
    await this.deps.progress.reset();
  }
}
