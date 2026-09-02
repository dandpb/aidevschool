import { createServices } from "../src/app/services";
import type { ProgressRepository, VerificationClient } from "../src/application/ports";
import type { EvidenceSink } from "../src/application/ports";
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

/** Cria serviços 100% em memória para testes. */
export function createTestServices(overrides?: {
  progressRepo?: ProgressRepository;
  clock?: () => Date;
  verification?: VerificationClient;
}) {
  const evidence = new InMemoryEvidenceSink();
  const base = createServices({
    progressRepo: overrides?.progressRepo,
    evidence,
    clock: overrides?.clock,
    verification: overrides?.verification,
  });
  return { ...base, evidence };
}
