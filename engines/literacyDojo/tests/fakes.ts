import { noopAnalyticsSink } from "../src/adapters/analyticsSinks";
import { createServices } from "../src/app/services";
import type {
  AnalyticsSink,
  ProgressRepository,
  VerificationClient,
} from "../src/application/ports";
import type { EvidenceSink } from "../src/application/ports";
import type { ProductAnalyticsEvent } from "../src/domain/analytics";
import type { LiteracyEvidenceRecord } from "../src/domain/evidence";
import type { LearnerProgress } from "../src/domain/progress";

/** Relógio fixo para testes determinísticos (streak, revisão, evidência). */
export function fixedClock(fixed: Date): () => Date {
  return () => new Date(fixed.getTime());
}

/** ProgressRepository em memória para testes. */
export class InMemoryProgressRepository implements ProgressRepository {
  private stored: LearnerProgress | null = null;

  seed(progress: LearnerProgress): void {
    this.stored = structuredClone(progress);
  }

  async load(): Promise<LearnerProgress | null> {
    return this.stored === null ? null : structuredClone(this.stored);
  }

  async save(progress: LearnerProgress): Promise<void> {
    this.stored = structuredClone(progress);
  }

  async reset(): Promise<void> {
    this.stored = null;
  }
}

/** Coleta a evidência em memória — canal de teste. */
export class InMemoryEvidenceSink implements EvidenceSink {
  readonly records: LiteracyEvidenceRecord[] = [];

  emit(record: LiteracyEvidenceRecord): void {
    this.records.push(record);
  }
}

/** Coleta os eventos de analytics em memória — canal de teste (ADR-0009). */
export class InMemoryAnalyticsSink implements AnalyticsSink {
  readonly events: ProductAnalyticsEvent[] = [];

  track(event: ProductAnalyticsEvent): void {
    this.events.push(event);
  }
}

/** Cria serviços 100% em memória para testes (analytics default: noop). */
export function createTestServices(overrides?: {
  progressRepo?: ProgressRepository;
  clock?: () => Date;
  verification?: VerificationClient;
  analytics?: AnalyticsSink;
}) {
  const evidence = new InMemoryEvidenceSink();
  const base = createServices({
    progressRepo: overrides?.progressRepo,
    evidence,
    clock: overrides?.clock,
    verification: overrides?.verification,
    analytics: overrides?.analytics ?? noopAnalyticsSink,
  });
  return { ...base, evidence };
}
