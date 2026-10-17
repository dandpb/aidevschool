import type { LearnerStateStore } from "../application/ports";
import { contentVersion } from "../data/generated/lessons";
import {
  validateCutoverSnapshot,
  validateLearnerState,
  validateResetIntent,
} from "../domain/learnerState";
import type { CutoverSnapshotV1, KeyRead, LearnerStateV1, ResetIntentV1 } from "../domain/xpLedger";
import {
  CUTOVER_SNAPSHOT_KEY,
  DB_NAME,
  LEARNER_STATE_KEY,
  PROGRESS_KEY,
  RESET_INTENT_KEY,
  STORE_NAME,
} from "./storageKeys";

const DB_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha no IndexedDB"));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    const rejectTransaction = () =>
      reject(transaction.error ?? new Error("Falha ao concluir a transação do IndexedDB"));
    transaction.addEventListener("error", rejectTransaction, { once: true });
    transaction.addEventListener("abort", rejectTransaction, { once: true });
  });
}

/**
 * Store do estado autoritativo completo (AID-3888) em IndexedDB.
 *
 * Cada leitura devolve `KeyRead` por chave — ausência confirmada, valor
 * presente inválido (validação total: estado/snapshot/intent têm versão
 * exata; progresso interno passa por `migrateProgress` com reason tipado)
 * e erro de leitura são discriminados, nunca colapsados (`46086ca0` P1).
 *
 * Escritas são puts de registro único — atômicos por transação. O ramo
 * legado (`PROGRESS_KEY`) não tem NENHUM método de escrita aqui: é
 * preservado por construção (`3b9e7f8a`). A ordem do corte (snapshot antes
 * da ativação) é responsabilidade do orquestrador (services.ts), que usa
 * `persistSnapshot` como gate de commit.
 */
export class IndexedDbLearnerStateStore implements LearnerStateStore {
  constructor(
    private readonly dbName = DB_NAME,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB indisponível neste navegador"));
    });
  }

  private async readKey<T>(key: string, validate: (raw: unknown) => T): Promise<KeyRead<T>> {
    let db: IDBDatabase;
    try {
      db = await this.openDb();
    } catch (error) {
      return { status: "read-error", error };
    }
    try {
      const raw = await requestToPromise<unknown>(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key),
      );
      if (raw === undefined) return { status: "absent" };
      try {
        return { status: "present-valid", value: validate(raw) };
      } catch (error) {
        return { status: "present-invalid", value: raw, reason: (error as Error).message };
      }
    } catch (error) {
      return { status: "read-error", error };
    } finally {
      db.close();
    }
  }

  private async putKey(key: string, value: unknown): Promise<void> {
    const db = await this.openDb();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(value, key);
      await transactionToPromise(transaction);
    } finally {
      db.close();
    }
  }

  private async deleteKey(key: string): Promise<void> {
    const db = await this.openDb();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(key);
      await transactionToPromise(transaction);
    } finally {
      db.close();
    }
  }

  readState(): Promise<KeyRead<LearnerStateV1>> {
    return this.readKey(LEARNER_STATE_KEY, (raw) =>
      validateLearnerState(raw, contentVersion, this.now()),
    );
  }

  async saveState(state: LearnerStateV1): Promise<void> {
    await this.putKey(LEARNER_STATE_KEY, state);
  }

  /** Ativação do estado novo — o orquestrador garante snapshot confirmado antes. */
  async activateState(state: LearnerStateV1): Promise<void> {
    await this.putKey(LEARNER_STATE_KEY, state);
  }

  /** Somente para reset explícito (marker-first). Nunca toca legado/snapshot. */
  async deleteState(): Promise<void> {
    await this.deleteKey(LEARNER_STATE_KEY);
  }

  readLegacyRaw(): Promise<KeyRead<unknown>> {
    // Valor cru, sem validação: quem decide é o orquestrador do corte.
    return this.readKey(PROGRESS_KEY, (raw) => raw);
  }

  readSnapshot(): Promise<KeyRead<CutoverSnapshotV1>> {
    return this.readKey(CUTOVER_SNAPSHOT_KEY, validateCutoverSnapshot);
  }

  /** Gate de commit do corte: precisa confirmar ANTES de activateState. */
  async persistSnapshot(snapshot: CutoverSnapshotV1): Promise<void> {
    await this.putKey(CUTOVER_SNAPSHOT_KEY, snapshot);
  }

  readResetIntent(): Promise<KeyRead<ResetIntentV1>> {
    return this.readKey(RESET_INTENT_KEY, validateResetIntent);
  }

  async saveResetIntent(intent: ResetIntentV1): Promise<void> {
    await this.putKey(RESET_INTENT_KEY, intent);
  }

  async deleteResetIntent(): Promise<void> {
    await this.deleteKey(RESET_INTENT_KEY);
  }
}
