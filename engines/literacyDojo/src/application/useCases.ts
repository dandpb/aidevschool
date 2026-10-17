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
import { parseImportedBackup, serializeBackupForExport } from "../domain/progressBackup";
import type { LearnerStateV1 } from "../domain/xpLedger";
import type {
  AnalyticsSink,
  ContentRepository,
  EvidenceSink,
  FeedbackProvider,
  LearnerStateStore,
} from "./ports";

/**
 * Casos de uso do vertical slice (plano seção 8): startLesson,
 * submitActivityAttempt, requestHint, retryActivity, completeLesson,
 * startReview, completeReview, resumeSession (+ completeOnboarding).
 */

export type UseCaseDeps = {
  content: ContentRepository;
  state: LearnerStateStore;
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
    return (await this.requireState()).progress;
  }

  /**
   * Carga autoritativa (AID-3888, precedência `e3ad989e`): o estado novo
   * válido é autoritativo — legado inválido/ilegível não bloqueia esta
   * carga (só os caminhos de corte/retomada dependem dele).
   */
  /** Persiste novo progresso sobre o estado corrente (ledger intacto). */
  private async withState(next: LearnerProgress): Promise<void> {
    const state = await this.requireState();
    await this.deps.state.saveState({ ...state, progress: next });
  }

  async requireState(): Promise<LearnerStateV1> {
    const read = await this.deps.state.readState();
    if (read.status === "present-valid") return read.value;
    if (read.status === "absent")
      throw new Error("Progresso não inicializado — o boot do app deve semear o estado inicial");
    if (read.status === "present-invalid")
      throw new Error(
        `Progresso local incompatível e preservado (nenhum dado foi apagado): ${read.reason ?? "forma inválida"}`,
      );
    throw new Error("Não foi possível ler o progresso local deste navegador (dados preservados).");
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
    await this.withState(next);
    return next;
  }

  async startLesson(lessonId: string): Promise<LearnerProgress> {
    const lesson = this.requireLesson(lessonId);
    const progress = await this.requireProgress();
    if (!isLessonUnlocked(progress, lessonId))
      throw new Error(`Lição bloqueada ou sem conteúdo: ${lessonId}`);
    const next = startLessonInDomain(progress, lessonId);
    await this.withState(next);
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
    await this.withState(next);
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

    const state = await this.requireState();
    const now = this.deps.clock();
    const transition = recordActivityAttempt(state.progress, state.xpLedger, {
      lessonId: lesson.id,
      activityId: input.activityId,
      evaluation,
      skillIds: lesson.skillIds,
      intervalsDays: lesson.review.intervalsDays,
      now,
    });
    const next = transition.progress;
    await this.deps.state.saveState({ ...state, progress: next, xpLedger: transition.ledger });

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
      await this.withState(progress);
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
      await this.withState(next);
    }
  }

  async completeLesson(input: {
    lessonId: string;
    bestScores: Record<string, number>;
    durationSeconds?: number;
  }): Promise<CompleteLessonResult> {
    const lesson = this.requireLesson(input.lessonId);
    const state = await this.requireState();
    const result = completeLessonInDomain(
      state.progress,
      state.xpLedger,
      lesson,
      input.bestScores,
      this.deps.content.listModules(),
      this.deps.clock(),
    );
    if (!result.outcome.completed) {
      return result;
    }
    await this.deps.state.saveState({
      ...state,
      progress: result.progress,
      xpLedger: result.ledger,
    });
    // ADR-0009 (emenda AID-913): exatamente 1× `lesson_completed` por
    // conclusão, após o progresso persistir. Fire-and-forget — o contrato dos
    // sinks é nunca lançar nem adiar a resposta; analytics nunca bloqueia a
    // lição.
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
          durationSeconds: input.durationSeconds,
        },
        {
          occurredAt: this.deps.clock().toISOString(),
          contentVersion: this.deps.content.getContentVersion(),
        },
      ),
    );
    return result;
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
    const state = await this.requireState();
    let progress = state.progress;
    if (outcome.completed) {
      if (input.intervalIndex !== undefined) {
        progress = scheduleReviewForLesson(
          progress,
          lesson,
          this.deps.clock(),
          input.intervalIndex,
        );
        await this.withState(progress);
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
    return { progress, ledger: state.xpLedger, outcome };
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
    await this.withState(next);
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
    await this.withState(result.progress);
    return result;
  }

  /** Ponto de retomada após reload: onboarding pendente → onboarding; lição em andamento → player; senão → home. */
  async resumeSession(): Promise<ResumeDestination> {
    const read = await this.deps.state.readState();
    const progress = read.status === "present-valid" ? read.value.progress : null;
    if (!progress || !progress.onboarding.completed) return { kind: "onboarding" };
    const current = progress.currentLessonId;
    if (current && progress.lessonStatus[current] === "in_progress") {
      return { kind: "lesson", lessonId: current };
    }
    return { kind: "home" };
  }

  /**
   * Exporta o estado autoritativo completo em envelope v2 (progresso +
   * ledger). O teto do produtor é `completed`, nunca `mastered`.
   */
  async exportProgress(): Promise<string> {
    const state = await this.requireState();
    return serializeBackupForExport(state);
  }

  /**
   * Importa um backup JSON com rejeição integral ANTES de persistir
   * (validação total: versão, campos, forma do ledger, datas). A gravação é
   * um put único do estado — falha não deixa estado parcial. O ramo legado
   * não é tocado.
   */
  async importProgress(raw: unknown): Promise<LearnerProgress> {
    const next = parseImportedBackup(raw, this.deps.content.getContentVersion(), this.deps.clock());
    await this.deps.state.saveState(next);
    return next.progress;
  }
}
