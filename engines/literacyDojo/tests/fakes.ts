import { createServices } from "../src/app/services";
import type {
  LearnerStateStore,
  ProgressRepository,
  VerificationClient,
} from "../src/application/ports";
import type { EvidenceSink } from "../src/application/ports";
import type { LiteracyEvidenceRecord } from "../src/domain/evidence";
import type { LearnerProgress } from "../src/domain/progress";
import { emptyXpLedger } from "../src/domain/xpLedger";
import type {
  CutoverSnapshotV1,
  KeyRead,
  LearnerStateV1,
  ResetIntentV1,
} from "../src/domain/xpLedger";

/** Relógio fixo para testes determinísticos (streak, revisão, evidência). */
export function fixedClock(fixed: Date): () => Date {
  return () => new Date(fixed.getTime());
}

/** ProgressRepository em memória para testes (ramo legado). */
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

/**
 * LearnerStateStore em memória para testes de casos de uso/app: grava e lê
 * os registros com a mesma semântica de chave do adapter real (ausência =
 * nunca escrito). Validação de forma não é papel do fake — quem valida é o
 * adapter real (`IndexedDbLearnerStateStore`), coberto pelos testes de
 * adapter com fake-indexeddb.
 */
export class InMemoryLearnerStateStore implements LearnerStateStore {
  private storedState: LearnerStateV1 | null = null;
  private storedSnapshot: CutoverSnapshotV1 | null = null;
  private storedIntent: ResetIntentV1 | null = null;
  private storedLegacy: unknown;
  private legacyWritten = false;
  private savesEnabled = true;

  seedState(state: LearnerStateV1): void {
    this.storedState = structuredClone(state);
  }

  /** Conveniência de teste: substitui o progresso mantendo o ledger corrente. */
  seedProgress(progress: LearnerProgress): void {
    const current = this.storedState ?? {
      stateVersion: 1 as const,
      origin: "fresh-seed" as const,
      progress,
      xpLedger: emptyXpLedger(),
    };
    this.storedState = structuredClone({ ...current, progress });
  }

  /** Conveniência de teste: lê o progresso como o repo legado fazia. */
  async loadProgress(): Promise<LearnerProgress | null> {
    return this.storedState === null ? null : structuredClone(this.storedState.progress);
  }

  seedSnapshot(snapshot: CutoverSnapshotV1): void {
    this.storedSnapshot = structuredClone(snapshot);
  }

  seedLegacy(raw: unknown): void {
    this.storedLegacy = structuredClone(raw);
    this.legacyWritten = true;
  }

  storedStateValue(): LearnerStateV1 | null {
    return this.storedState;
  }

  storedSnapshotValue(): CutoverSnapshotV1 | null {
    return this.storedSnapshot;
  }

  storedIntentValue(): ResetIntentV1 | null {
    return this.storedIntent;
  }

  legacyValue(): unknown {
    return this.storedLegacy;
  }

  /** Falha toda gravação (prova P5: falha de gravação não deixa estado parcial). */
  failSaves(): void {
    this.savesEnabled = false;
  }

  restoreSaves(): void {
    this.savesEnabled = true;
  }

  private saveCheck(): void {
    if (!this.savesEnabled) throw new Error("Falha injetada na gravação (teste)");
  }

  async readState(): Promise<KeyRead<LearnerStateV1>> {
    return this.storedState === null
      ? { status: "absent" }
      : { status: "present-valid", value: structuredClone(this.storedState) };
  }

  async saveState(state: LearnerStateV1): Promise<void> {
    this.saveCheck();
    this.storedState = structuredClone(state);
  }

  async activateState(state: LearnerStateV1): Promise<void> {
    this.saveCheck();
    this.storedState = structuredClone(state);
  }

  async deleteState(): Promise<void> {
    this.storedState = null;
  }

  async readLegacyRaw(): Promise<KeyRead<unknown>> {
    return this.legacyWritten
      ? { status: "present-valid", value: structuredClone(this.storedLegacy) }
      : { status: "absent" };
  }

  async readSnapshot(): Promise<KeyRead<CutoverSnapshotV1>> {
    return this.storedSnapshot === null
      ? { status: "absent" }
      : { status: "present-valid", value: structuredClone(this.storedSnapshot) };
  }

  async persistSnapshot(snapshot: CutoverSnapshotV1): Promise<void> {
    this.saveCheck();
    this.storedSnapshot = structuredClone(snapshot);
  }

  async readResetIntent(): Promise<KeyRead<ResetIntentV1>> {
    return this.storedIntent === null
      ? { status: "absent" }
      : { status: "present-valid", value: structuredClone(this.storedIntent) };
  }

  async saveResetIntent(intent: ResetIntentV1): Promise<void> {
    this.saveCheck();
    this.storedIntent = structuredClone(intent);
  }

  async deleteResetIntent(): Promise<void> {
    this.storedIntent = null;
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
  stateStore?: LearnerStateStore;
  clock?: () => Date;
  verification?: VerificationClient;
}) {
  const evidence = new InMemoryEvidenceSink();
  const base = createServices({
    stateStore: overrides?.stateStore,
    evidence,
    clock: overrides?.clock,
    verification: overrides?.verification,
  });
  return { ...base, evidence };
}
