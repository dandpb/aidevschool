import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
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
