import type { Clock } from "../adapters/clock";
import type { ActivityDefinition, LessonDefinition } from "../data/generated/lessons";
import { type ActivityAnswer, type EvaluationResult, evaluateActivity } from "../domain/evaluation";
import { type LiteracyEvidenceRecord, buildEvidenceRecord } from "../domain/evidence";
import type { AttemptFeedback } from "../domain/feedback";
import {
  type AudienceChoice,
  type CompleteLessonResult,
  type LearnerProgress,
  MAP_INITIAL_LESSON_ID,
  type OnboardingConfidence,
  type OnboardingContext,
  type OnboardingGoal,
  type OnboardingTaskCategory,
  completeLesson as completeLessonInDomain,
  completeOnboarding,
  evaluateLessonCompletion,
  isLessonUnlocked,
  recordActivityAttempt,
  recordMapInitialHintRequest,
  recordMapInitialRetry,
  startLesson as startLessonInDomain,
} from "../domain/progress";
import { parseImportedProgress, serializeProgressForExport } from "../domain/progressBackup";
import type {
  ContentRepository,
  EvidenceSink,
  FeedbackProvider,
  ProgressRepository,
} from "./ports";

/**
 * Casos de uso do vertical slice (plano seção 8): startLesson,
 * submitActivityAttempt, requestHint, retryActivity, completeLesson,
 * startReview, completeReview, resumeSession (+ completeOnboarding).
 */

export type UseCaseDeps = {
  content: ContentRepository;
  progress: ProgressRepository;
  evidence: EvidenceSink;
  feedback: FeedbackProvider;
  clock: Clock;
};

export type SubmitAttemptResult = {
  progress: LearnerProgress;
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
  record: LiteracyEvidenceRecord;
};

export type ResumeDestination =
  | { kind: "onboarding" }
  | { kind: "home" }
  | { kind: "lesson"; lessonId: string };

/**
 * Lições autorizadas pelo contrato hospedado (missões publicadas pelo OS).
 * Espelha as bindings publicadas em engines/codexdojo-os-prototype/config/
 * mission-bindings.yaml: l01–l14 + l18–l19 (mod-06) na trilha ai-pratica e
 * l15–l17 (mod-05, journey dev) na trilha dev. Lições do catálogo fora
 * desse conjunto continuam não hospedadas.
 */
const HOSTED_OS_MISSION_LESSONS = new Set([
  "l01",
  "l02",
  "l03",
  "l04",
  "l05",
  "l06",
  "l07",
  "l08",
  "l09",
  "l10",
  "l11",
  "l12",
  "l13",
  "l14",
  "l15",
  "l16",
  "l17",
  "l18",
  "l19",
]);

export class LiteracyUseCases {
  constructor(private readonly deps: UseCaseDeps) {}

  private requireLesson(lessonId: string): LessonDefinition {
    const lesson = this.deps.content.getLesson(lessonId);
    if (!lesson) throw new Error(`Lição não encontrada no read model: ${lessonId}`);
    return lesson;
  }

  private requireActivity(lesson: LessonDefinition, activityId: string): ActivityDefinition {
    const activity = lesson.activities.find((item) => item.id === activityId);
    if (!activity) throw new Error(`Atividade não encontrada: ${activityId}`);
    return activity;
  }

  private async requireProgress(): Promise<LearnerProgress> {
    const progress = await this.deps.progress.load();
    if (!progress)
      throw new Error("Progresso não inicializado — o boot do app deve semear o estado inicial");
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
    return next;
  }

  async startLesson(lessonId: string): Promise<LearnerProgress> {
    this.requireLesson(lessonId);
    const progress = await this.requireProgress();
    if (!isLessonUnlocked(progress, lessonId))
      throw new Error(`Lição bloqueada ou sem conteúdo: ${lessonId}`);
    const next = startLessonInDomain(progress, lessonId);
    await this.deps.progress.save(next);
    return next;
  }

  async prepareHostedMission(lessonId: string): Promise<LearnerProgress> {
    const lesson = this.requireLesson(lessonId);
    if (!HOSTED_OS_MISSION_LESSONS.has(lessonId)) {
      throw new Error(`Lição não autorizada pelo contrato hospedado: ${lessonId}`);
    }
    let progress = await this.requireProgress();
    if (!progress.onboarding.completed) {
      // Lições fora dos módulos do percurso público pertencem à journey dev:
      // o onboarding hospedado registra a audiência correspondente.
      const publicModuleIds = new Set(this.deps.content.listModules().map((module) => module.id));
      const audience = publicModuleIds.has(lesson.moduleId) ? "ia_pratica" : "trilha_dev";
      progress = completeOnboarding(progress, {
        goal: "verify_answers",
        context: "work",
        confidence: "medium",
        taskCategory: "news_research",
        audience,
      });
    }
    if (!isLessonUnlocked(progress, lessonId)) {
      progress = {
        ...progress,
        lessonStatus: { ...progress.lessonStatus, [lessonId]: "available" },
      };
    }
    const next = startLessonInDomain(progress, lessonId);
    await this.deps.progress.save(next);
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
    const now = this.deps.clock();
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
      answer: input.answer,
      timestamp: now.toISOString(),
      context: input.context ?? "initial",
    });
    this.deps.evidence.emit(record);

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
    return { hint, nextIndex: input.hintIndex + 1 };
  }

  /**
   * Tentar novamente: as respostas são transitórias por decisão de privacidade
   * (storage.policy), então o caso de uso não apaga estado persistido — ele
   * registra a intenção e a UI limpa a resposta local.
   */
  async retryActivity(input: { lessonId: string; activityId: string }): Promise<void> {
    const lesson = this.requireLesson(input.lessonId);
    this.requireActivity(lesson, input.activityId);
    if (input.lessonId === MAP_INITIAL_LESSON_ID) {
      const progress = await this.requireProgress();
      const next = recordMapInitialRetry(progress);
      await this.deps.progress.save(next);
    }
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
      this.deps.clock(),
    );
    if (!result.outcome.completed) {
      return result;
    }
    await this.deps.progress.save(result.progress);
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
      throw new Error(`Lição bloqueada ou sem conteúdo: ${lessonId}`);
    }
    const bestPasses = Math.max(
      0,
      ...lesson.skillIds.map((skillId) => (progress.skills[skillId]?.passes ?? 1) - 1),
    );
    const stage = Math.min(lesson.review.intervalsDays.length - 1, bestPasses);
    const intervalDays = lesson.review.intervalsDays[stage] ?? 1;
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
    return { progress, outcome };
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

  /** Serializa o progresso local. O teto do produtor é `completed`, nunca `mastered`. */
  async exportProgress(): Promise<string> {
    const progress = await this.requireProgress();
    return serializeProgressForExport(progress);
  }

  /** Importa um backup JSON; a migração forward-only roda antes de persistir. */
  async importProgress(raw: unknown): Promise<LearnerProgress> {
    const next = parseImportedProgress(
      raw,
      this.deps.content.getContentVersion(),
      this.deps.clock(),
    );
    await this.deps.progress.save(next);
    return next;
  }
}
