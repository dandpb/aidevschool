import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDbProgressRepository } from "../../src/adapters/indexedDbProgressRepository";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { UnmigratableProgressError } from "../../src/domain/migration";
import { createInitialProgress } from "../../src/domain/progress";

let dbCounter = 0;

function makeRepo() {
  dbCounter += 1;
  return new IndexedDbProgressRepository(`literacydojo-test-${dbCounter}`);
}

describe("IndexedDbProgressRepository (fake-indexeddb)", () => {
  let repo: IndexedDbProgressRepository;

  beforeEach(() => {
    repo = makeRepo();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("load sem nada salvo retorna null", async () => {
    expect(await repo.load()).toBeNull();
  });

  it("save → load faz roundtrip do progresso", async () => {
    const progress = createInitialProgress(modules, contentVersion);
    progress.xp = 42;
    await repo.save(progress);
    const loaded = await repo.load();
    expect(loaded?.xp).toBe(42);
    expect(loaded?.contentVersion).toBe(contentVersion);
  });

  it("save só resolve depois de a transação de escrita concluir", async () => {
    const originalTransaction = IDBDatabase.prototype.transaction;
    let transactionCompleted = false;
    vi.spyOn(IDBDatabase.prototype, "transaction").mockImplementation(function (
      this: IDBDatabase,
      storeNames: string | Iterable<string>,
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) {
      const transaction = originalTransaction.call(this, storeNames, mode, options);
      if (mode === "readwrite") {
        transaction.addEventListener("complete", () => {
          transactionCompleted = true;
        });
      }
      return transaction;
    });

    await repo.save(createInitialProgress(modules, contentVersion));

    expect(transactionCompleted).toBe(true);
  });

  it("save propaga aborto ocorrido depois do sucesso do put", async () => {
    const originalPut = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      const request =
        key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key);
      request.addEventListener(
        "success",
        () => {
          this.transaction.abort();
        },
        { once: true },
      );
      return request;
    });

    await expect(repo.save(createInitialProgress(modules, contentVersion))).rejects.toThrow(
      "Falha ao concluir a transação do IndexedDB",
    );
  });

  it("reset apaga o progresso", async () => {
    await repo.save(createInitialProgress(modules, contentVersion));
    await repo.reset();
    expect(await repo.load()).toBeNull();
  });

  it("contentVersion antiga é migrada na leitura mantendo completed", async () => {
    const progress = createInitialProgress(modules, "2026-01-01.0");
    const firstReady = Object.keys(progress.lessonStatus)[0];
    progress.lessonStatus[firstReady] = "completed";
    await repo.save(progress);
    const loaded = await repo.load();
    expect(loaded?.contentVersion).toBe(contentVersion);
    expect(loaded?.lessonStatus[firstReady]).toBe("completed");
  });

  it("schemaVersion incompatível lança UnmigratableProgressError (sem fallback silencioso)", async () => {
    const progress = createInitialProgress(modules, contentVersion);
    await repo.save({ ...progress, schemaVersion: 99 } as never);
    await expect(repo.load()).rejects.toThrow(UnmigratableProgressError);
  });
});
