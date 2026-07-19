import type {
  ActivityDefinition,
  LessonDefinition,
  ModuleDefinition,
  SkillDefinition,
  Track,
} from "../data/generated/lessons";
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
  listSkills(): SkillDefinition[];
  listLessons(): LessonDefinition[];
  getLesson(lessonId: string): LessonDefinition | undefined;
  getSkillTitle(skillId: string): string;
  getContentVersion(): string;
}

export interface ProgressRepository {
  load(): Promise<LearnerProgress | null>;
  save(progress: LearnerProgress): Promise<void>;
  reset(): Promise<void>;
}

export interface EvidenceSink {
  emit(record: LiteracyEvidenceRecord): void;
}

export interface FeedbackProvider {
  feedbackFor(activity: ActivityDefinition, evaluation: EvaluationResult): AttemptFeedback;
  /** Dica pré-escrita de índice `hintIndex`, ou null quando não há mais dicas. */
  hintFor(activity: ActivityDefinition, hintIndex: number): string | null;
  hintCount(activity: ActivityDefinition): number;
}

export type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

export interface AnalyticsSink {
  track(event: string, payload?: AnalyticsPayload): void;
}

export interface Clock {
  now(): Date;
}
