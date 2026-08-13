import type {
  ActivityDefinition,
  LessonDefinition,
  ModuleDefinition,
  Track,
} from "../data/generated/lessons";
import type { ProductAnalyticsEvent } from "../domain/analytics";
import type { EvaluationResult } from "../domain/evaluation";
import type { LiteracyEvidenceRecord } from "../domain/evidence";
import type { AttemptFeedback } from "../domain/feedback";
import type { LearnerProgress } from "../domain/progress";

/**
 * Portas do bounded context (plano seção 8). O domínio e os casos de uso
 * dependem somente destas interfaces; adapters locais vivem em src/adapters/.
 * Adapters remotos (backend multiusuário) só entram em fase posterior, por
 * decisão arquitetural própria.
 */

export interface ContentRepository {
  getTrack(): Track;
  listModules(): ModuleDefinition[];
  getLesson(lessonId: string): LessonDefinition | undefined;
  getSkillTitle(skillId: string): string;
  getContentVersion(): string;
}

export interface ProgressRepository {
  load(): Promise<LearnerProgress | null>;
  save(progress: LearnerProgress): Promise<void>;
  reset(): Promise<void>;
}

export type EvidenceSink = {
  emit(record: LiteracyEvidenceRecord): void;
};

/**
 * Product analytics (ADR-0009). Medido é progresso de experiência e
 * engajamento — nunca competência. A fronteira de privacidade é inviolável:
 * os eventos são um vocabulário fechado com props primitivas (ver
 * `src/domain/analytics.ts`); nenhum texto livre ou dado pessoal sai por
 * aqui. Implementações degradam silenciosamente (analytics nunca bloqueia a
 * lição) e o padrão sem backend configurado é no-op.
 */
export interface AnalyticsSink {
  track(event: ProductAnalyticsEvent): void;
}

export interface FeedbackProvider {
  feedbackFor(activity: ActivityDefinition, evaluation: EvaluationResult): AttemptFeedback;
  /** Dica pré-escrita de índice `hintIndex`, ou null quando não há mais dicas. */
  hintFor(activity: ActivityDefinition, hintIndex: number): string | null;
  hintCount(activity: ActivityDefinition): number;
}
