import type { AnalyticsIdentity } from "../adapters/analyticsIdentity";
import type { Clock } from "../adapters/clock";
import type { ActivityDefinition, LessonDefinition } from "../data/generated/lessons";
import {
  buildActivityAttemptedEvent,
  buildLessonCompletedEvent,
  buildLessonStartedEvent,
  buildReviewCompletedEvent,
  buildReviewStartedEvent,
} from "../domain/analytics";
import {
  type CompleteCheckpointResult,
  type ModuleCheckpointId,
  checkpointById,
  completeCheckpointSession,
  isCheckpointAvailable,
  isCheckpointCompleted,
  startCheckpointSession,
} from "../domain/checkpoints";
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
  scheduleReviewForLesson,
  startLesson as startLessonInDomain,
} from "../domain/progress";
import { parseImportedProgress, serializeProgressForExport } from "../domain/progressBackup";
import type {
  AnalyticsSink,
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
  /** Analytics de produto (ADR-0009, emenda AID-913): funil entry→start→attempt→complete. */
  analytics: AnalyticsSink;
  /** Identidade anônima efêmera (sessionId por page load + eventId por evento). */
  analyticsIdentity: AnalyticsIdentity;
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
 * mission-bindings.yaml: l01–l14 + l18–l20 (mod-06), l24–l26 (mod-07,
 * onda O2 completa) e l30–l32 (mod-08, onda W1 completa) na trilha
 * ai-pratica e l15–l17 + l21–l23 + l27–l29
 * (mod-05, journey dev; onda O1 completa) na trilha dev. Lições do
 * catálogo fora desse conjunto continuam não hospedadas.
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
  "l20",
  "l21",
  "l22",
  "l23",
  "l24",
  "l25",
  "l26",
  "l27",
  "l28",
  "l29",
  "l30",
  "l31",
  "l32",
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
    const lesson = this.requireLesson(lessonId);
    const progress = await this.requireProgress();
    if (!isLessonUnlocked(progress, lessonId))
      throw new Error(`Lição bloqueada ou sem conteúdo: ${lessonId}`);
    const next = startLessonInDomain(progress, lessonId);
    await this.deps.progress.save(next);
    // Funil AID-913: estágio "início de lição". Fire-and-forget após o
    // progresso persistir — o sink nunca lança nem bloqueia a lição.
    this.deps.analytics.track(
      buildLessonStartedEvent(
        {
          sessionId: this.deps.analyticsIdentity.sessionId,
          eventId: this.deps.analyticsIdentity.nextEventId(),
        },
        { lessonId: lesson.id, lessonVersion: lesson.version },
        {
          occurredAt: this.deps.clock().toISOString(),
          contentVersion: this.deps.content.getContentVersion(),
        },
      ),
    );
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

    // Funil AID-913: estágio "tentativa" — passa ou não; tentativas repetidas
    // na mesma lição/sessão são o marcador de retry. A avaliação detalhada
    // fica na evidência (canal próprio); analytics carrega só o resultado.
    this.deps.analytics.track(
      buildActivityAttemptedEvent(
        {
          sessionId: this.deps.analyticsIdentity.sessionId,
          eventId: this.deps.analyticsIdentity.nextEventId(),
        },
        {
          lessonId: lesson.id,
          activityType: activity.type,
          passed: evaluation.pass,
        },
        {
          occurredAt: now.toISOString(),
          contentVersion: this.deps.content.getContentVersion(),
        },
      ),
    );

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
    const modules = this.deps.content.listModules();
    const now = this.deps.clock();
    if (typeof this.deps.progress.update === "function") {
      // AID-3740 (S5-RACE): a transição de status — e portanto o
      // `firstCompletion`, o bônus +25 e o `lesson_completed` — é decidida
      // DENTRO da transação atômica contra o estado commitado, não contra um
      // snapshot pré-carga. Duas abas concorrentes serializam no commit: a
      // 2ª vê `completed` e degrada para replay (sem 2º evento, sem 2º
      // bônus), preservando +10 por atividade e o replay sequencial.
      let computed: CompleteLessonResult | undefined;
      await this.deps.progress.update((current) => {
        if (!current) {
          throw new Error(
            "Progresso não inicializado — o boot do app deve semear o estado inicial",
          );
        }
        computed = completeLessonInDomain(current, lesson, input.bestScores, modules, now);
        return computed.progress;
      });
      if (!computed) {
        throw new Error("Falha invariante: o update atômico não devolveu o resultado computado");
      }
      const result = computed;
      if (!result.outcome.completed) {
        return result;
      }
      this.trackLessonCompleted(lesson, result, input.durationSeconds);
      return result;
    }
    const progress = await this.requireProgress();
    const result = completeLessonInDomain(progress, lesson, input.bestScores, modules, now);
    if (!result.outcome.completed) {
      return result;
    }
    await this.deps.progress.save(result.progress);
    this.trackLessonCompleted(lesson, result, input.durationSeconds);
    return result;
  }

  /**
   * ADR-0009 (emendas AID-913 e AID-3731): exatamente 1× `lesson_completed`
   * por LIÇÃO — emitido somente na primeira conclusão (transição de status
   * para `completed`), após o progresso persistir. Replay/prática de lição
   * concluída continua permitido e mensurável pelos eventos de engajamento
   * (`lesson_started`, `activity_attempted` — e `review_*` no corredor),
   * sem re-contar conclusões. Fire-and-forget — o contrato dos sinks é
   * nunca lançar nem adiar a resposta; analytics nunca bloqueia a lição.
   */
  private trackLessonCompleted(
    lesson: LessonDefinition,
    result: CompleteLessonResult,
    durationSeconds: number | undefined,
  ): void {
    if (!result.firstCompletion) {
      return;
    }
    this.deps.analytics.track(
      buildLessonCompletedEvent(
        {
          sessionId: this.deps.analyticsIdentity.sessionId,
          eventId: this.deps.analyticsIdentity.nextEventId(),
        },
        {
          lessonId: lesson.id,
          lessonVersion: lesson.version,
          score: result.outcome.lessonScore,
          durationSeconds,
        },
        {
          occurredAt: this.deps.clock().toISOString(),
          contentVersion: this.deps.content.getContentVersion(),
        },
      ),
    );
  }

  /**
   * Início de uma revisão espaçada: a lição precisa estar concluída. Não muda
   * status nem concede XP — registra o evento de medição (spec AID-915 §4.3)
   * e devolve o contexto. Fire-and-forget: analytics nunca bloqueia a lição.
   */
  async startReview(
    lessonId: string,
  ): Promise<{ progress: LearnerProgress; intervalDays: number; stage: number }> {
    const lesson = this.requireLesson(lessonId);
    const progress = await this.requireProgress();
    if (progress.lessonStatus[lessonId] !== "completed") {
      throw new Error(`Lição bloqueada ou sem conteúdo: ${lessonId}`);
    }
    const bestStage = Math.max(
      0,
      ...lesson.skillIds.map((skillId) => {
        const practice = progress.skills[skillId];
        // Estágio persistido (§4.4) manda; legado sem estágio deriva de passes.
        return practice?.reviewStage ?? (practice?.passes ?? 1) - 1;
      }),
    );
    const stage = Math.min(lesson.review.intervalsDays.length - 1, bestStage);
    const intervalDays = lesson.review.intervalsDays[stage] ?? 1;
    this.deps.analytics.track(
      buildReviewStartedEvent(
        {
          sessionId: this.deps.analyticsIdentity.sessionId,
          eventId: this.deps.analyticsIdentity.nextEventId(),
        },
        { lessonId, intervalDays, stage },
        {
          occurredAt: this.deps.clock().toISOString(),
          contentVersion: this.deps.content.getContentVersion(),
        },
      ),
    );
    return { progress, intervalDays, stage };
  }

  /**
   * Conclusão de uma revisão espaçada: sem XP de lição e sem desbloqueio. Com
   * `intervalIndex` (estágio na abertura + 1), REAGENDA a lição em exatamente
   * um hop da janela [1,7,21] com clamp no último estágio (spec AID-915 §4.4
   * — uma sessão de revisão = um avanço de estágio; sem isso, lições de N
   * atividades saltariam N estágios por sessão). Emite `review_completed`
   * quando aprovada (spec AID-915 §4.3).
   */
  async completeReview(input: {
    lessonId: string;
    bestScores: Record<string, number>;
    intervalIndex?: number;
  }): Promise<CompleteLessonResult> {
    const lesson = this.requireLesson(input.lessonId);
    const outcome = evaluateLessonCompletion(lesson, input.bestScores);
    let progress = await this.requireProgress();
    if (outcome.completed) {
      if (input.intervalIndex !== undefined) {
        progress = scheduleReviewForLesson(
          progress,
          lesson,
          this.deps.clock(),
          input.intervalIndex,
        );
        await this.deps.progress.save(progress);
      }
      this.deps.analytics.track(
        buildReviewCompletedEvent(
          {
            sessionId: this.deps.analyticsIdentity.sessionId,
            eventId: this.deps.analyticsIdentity.nextEventId(),
          },
          { lessonId: input.lessonId, score: outcome.lessonScore },
          {
            occurredAt: this.deps.clock().toISOString(),
            contentVersion: this.deps.content.getContentVersion(),
          },
        ),
      );
    }
    // Revisão espaçada nunca é 1ª conclusão (spec AID-915 §4.3; AID-3731):
    // sem XP de lição, sem novo `lesson_completed`.
    return { progress, outcome, firstCompletion: false };
  }

  /**
   * Corredor literacy (spec AID-915 §3): início de uma sessão de Desafio de
   * Módulo. Exige disponibilidade (última lição do módulo concluída) e conta
   * a tentativa. As atividades são submetidas pelo fluxo comum
   * (`submitActivityAttempt`) com o lessonId ORIGINAL e `context:"review"` —
   * schema de evidência intacto, skills avançam pelo caminho já existente.
   */
  async startCheckpoint(checkpointId: ModuleCheckpointId): Promise<{ progress: LearnerProgress }> {
    const progress = await this.requireProgress();
    const next = startCheckpointSession(progress, this.deps.content.listModules(), checkpointId);
    await this.deps.progress.save(next);
    return { progress: next };
  }

  /** Disponibilidade/completação do desafio para a UI (mapa, home). */
  async checkpointState(checkpointId: ModuleCheckpointId): Promise<{
    available: boolean;
    completed: boolean;
  }> {
    const progress = await this.requireProgress();
    return {
      available: isCheckpointAvailable(progress, this.deps.content.listModules(), checkpointId),
      completed: isCheckpointCompleted(progress, checkpointId),
    };
  }

  /**
   * Fim de uma sessão de Desafio: média das melhores notas ≥ 0.75 →
   * `completed` + desbloqueio da primeira lição do módulo seguinte (gate
   * locked-only). Falha não muda status (retry ilimitado, §3.4).
   */
  async completeCheckpoint(input: {
    checkpointId: ModuleCheckpointId;
    bestScores: Record<string, number>;
  }): Promise<CompleteCheckpointResult> {
    const checkpoint = checkpointById(input.checkpointId);
    const progress = await this.requireProgress();
    const scores = checkpoint.activityRefs.map(
      (ref) => input.bestScores[`${ref.lessonId}:${ref.activityId}`] ?? 0,
    );
    const result = completeCheckpointSession(
      progress,
      this.deps.content.listModules(),
      input.checkpointId,
      scores,
      this.deps.clock(),
    );
    await this.deps.progress.save(result.progress);
    return result;
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
