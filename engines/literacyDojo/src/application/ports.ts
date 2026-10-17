import type { CompetencyMapping } from "../data/generated/competency-map";
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
import type { LiteracyVerificationReceipt } from "../domain/verification";
import type { CutoverSnapshotV1, KeyRead, LearnerStateV1, ResetIntentV1 } from "../domain/xpLedger";

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
  /**
   * Competência da lição (contrato AID-3514 §7.1(2), colapsada):
   * `null` ≡ «não mapeada» — cobre `mapping: null` do mapa e o `undefined`
   * legado (sem entrada no mapa). Estado legítimo, nunca erro; nunca infere
   * `primary`; nunca lança. Leitura pura: não toca progresso.
   */
  getCompetency(lessonId: string): CompetencyMapping | null;
  /**
   * §7.1(3): distingue «não mapeada» (entrada com mapping null) de
   * fora-do-universo (planned/ausente do mapa) — para decisão de render
   * (Fase 3, dono UX). Não é gate de visibilidade (§4.5).
   */
  hasCompetencyEntry(lessonId: string): boolean;
}

export interface ProgressRepository {
  load(): Promise<LearnerProgress | null>;
  save(progress: LearnerProgress): Promise<void>;
  reset(): Promise<void>;
}

/**
 * Porta do estado autoritativo completo (AID-3888: contrato `a0bf3e8a` +
 * errata `25b51990` + correções `3b9e7f8a`/`46086ca0`/`e3ad989e`).
 *
 * Invariantes da porta:
 * - Leituras por chave NUNCA colapsam ausência confirmada, valor presente
 *   inválido e erro de leitura (`KeyRead`).
 * - `persistSnapshot` é o gate de commit do corte: precisa confirmar ANTES
 *   de qualquer escrita do estado novo (`activateState`).
 * - Escritas são puts de registro único (atômicos por si); não existe método
 *   que escreva ou apague o RAMO LEGADO — o legado é preservado.
 * - `deleteState` só existe para o reset explícito (marker-first: o chamador
 *   persiste `saveResetIntent` ANTES de apagar o estado).
 */
export interface LearnerStateStore {
  readState(): Promise<KeyRead<LearnerStateV1>>;
  saveState(state: LearnerStateV1): Promise<void>;
  activateState(state: LearnerStateV1): Promise<void>;
  deleteState(): Promise<void>;
  readLegacyRaw(): Promise<KeyRead<unknown>>;
  readSnapshot(): Promise<KeyRead<CutoverSnapshotV1>>;
  persistSnapshot(snapshot: CutoverSnapshotV1): Promise<void>;
  readResetIntent(): Promise<KeyRead<ResetIntentV1>>;
  saveResetIntent(intent: ResetIntentV1): Promise<void>;
  deleteResetIntent(): Promise<void>;
}

export type EvidenceSink = {
  emit(record: LiteracyEvidenceRecord): void;
};

export interface VerificationClient {
  verify(record: LiteracyEvidenceRecord): Promise<LiteracyVerificationReceipt>;
}

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
