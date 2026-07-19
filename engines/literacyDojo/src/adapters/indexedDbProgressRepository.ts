import type { ProgressRepository } from "../application/ports";
import { contentVersion } from "../data/generated/lessons";
import { migrateProgress } from "../domain/migration";
import type { LearnerProgress } from "../domain/progress";

const DB_VERSION = 1;
const STORE_NAME = "progress";
const PROGRESS_KEY = "learner-progress";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha no IndexedDB"));
  });
}

/**
 * Persistência local de progresso em IndexedDB (recomendada pelo plano seção 6).
 * A chave única guarda o LearnerProgress inteiro; a migração forward-only roda
 * na leitura (content-contract regra 4). IndexedDB é assíncrono e não bloqueia
 * a UI, ao contrário de localStorage — ver README ("Decisões").
 */
export class IndexedDbProgressRepository implements ProgressRepository {
  constructor(private readonly dbName = "literacydojo") {}

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
      await requestToPromise(
        db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(progress, PROGRESS_KEY),
      );
    } finally {
      db.close();
    }
  }

  async reset(): Promise<void> {
    const db = await this.openDb();
    try {
      await requestToPromise(
        db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(PROGRESS_KEY),
      );
    } finally {
      db.close();
    }
  }
}
