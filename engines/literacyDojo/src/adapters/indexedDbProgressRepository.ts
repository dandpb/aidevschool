import type { ProgressRepository } from "../application/ports";
import { contentVersion } from "../data/generated/lessons";
import { migrateProgress } from "../domain/migration";
import type { LearnerProgress } from "../domain/progress";
import { DB_NAME, PROGRESS_KEY, STORE_NAME } from "./storageKeys";

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
 * Persistência local de progresso em IndexedDB (recomendada pelo plano seção 6).
 * A chave única guarda o LearnerProgress inteiro; a migração forward-only roda
 * na leitura (content-contract regra 4). IndexedDB é assíncrono e não bloqueia
 * a UI, ao contrário de localStorage — ver README ("Decisões").
 */
export class IndexedDbProgressRepository implements ProgressRepository {
  constructor(private readonly dbName = DB_NAME) {}

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

  async load(): Promise<LearnerProgress | null> {
    const db = await this.openDb();
    try {
      const raw = await requestToPromise<unknown>(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PROGRESS_KEY),
      );
      if (raw === undefined) return null;
      return migrateProgress(raw, contentVersion);
    } finally {
      db.close();
    }
  }

  async save(progress: LearnerProgress): Promise<void> {
    const db = await this.openDb();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(progress, PROGRESS_KEY);
      await transactionToPromise(transaction);
    } finally {
      db.close();
    }
  }

  /**
   * Read-modify-write atômico (AID-3740): get → migrate → mutate → put dentro
   * de UMA transação readwrite. O `put` é emitido no callback `onsuccess` do
   * `get` (mesma ativação da transação — jamais entre awaits, que drenariam a
   * fila de microtasks e deixariam a transação auto-commitar). Transações
   * IndexedDB do mesmo banco serializam em commit: duas abas executando
   * `update` concorrentemente veem, a segunda, o estado commitado pela
   * primeira — fechando o TOCTOU load→compute→save→emit da corrida
   * multi-tab (2× `lesson_completed` em 2/5 execuções no registro S5-RACE).
   * Erro do callback aborta a transação e repassa a exceção original.
   */
  async update(
    mutate: (current: LearnerProgress | null) => LearnerProgress,
  ): Promise<LearnerProgress> {
    const db = await this.openDb();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(PROGRESS_KEY);
      let committed: LearnerProgress | null = null;
      let failure: unknown = null;
      getRequest.onsuccess = () => {
        try {
          const raw = getRequest.result;
          const current = raw === undefined ? null : migrateProgress(raw, contentVersion);
          committed = mutate(current);
          store.put(committed, PROGRESS_KEY);
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      await transactionToPromise(transaction).catch((error: unknown) => {
        if (failure !== null) throw failure;
        throw error;
      });
      if (committed === null) {
        throw new Error("Falha ao atualizar o progresso no IndexedDB");
      }
      return committed;
    } finally {
      db.close();
    }
  }

  async reset(): Promise<void> {
    const db = await this.openDb();
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(PROGRESS_KEY);
      await transactionToPromise(transaction);
    } finally {
      db.close();
    }
  }
}
