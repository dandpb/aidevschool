import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDbProgressRepository } from "../../src/adapters/indexedDbProgressRepository";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { createInitialProgress } from "../../src/domain/progress";

// AID-3740 (S5-RACE): asserções do read-modify-write atômico do adaptador
// IndexedDB vivem em arquivo NOVO (política protect-tests — criação
// permitida; nenhum teste existente editado).

let dbCounter = 0;

function makeRepo() {
  dbCounter += 1;
  return new IndexedDbProgressRepository(`literacydojo-update-test-${dbCounter}`);
}

function initialProgress() {
  return createInitialProgress(modules, contentVersion);
}

describe("IndexedDbProgressRepository.update (RMW atômico, AID-3740)", () => {
  it("commita o resultado do mutate e o load reflete (roundtrip)", async () => {
    const repo = makeRepo();
    const seeded = initialProgress();
    await repo.save(seeded);

    const committed = await repo.update((current) => {
      if (!current) throw new Error("estado ausente");
      expect(current.xp).toBe(seeded.xp);
      return { ...current, xp: current.xp + 25 };
    });
    expect(committed.xp).toBe(seeded.xp + 25);
    expect((await repo.load())?.xp).toBe(seeded.xp + 25);
  });

  it("banco vazio entrega null ao mutate e commita o progresso devolvido (bootstrap)", async () => {
    const repo = makeRepo();
    const progress = initialProgress();

    const committed = await repo.update((current) => {
      expect(current).toBeNull();
      return progress;
    });
    expect(committed).toBe(progress);
    expect((await repo.load())?.contentVersion).toBe(contentVersion);
  });

  it("dois updates concorrentes serializam: nenhum incremento perdido (a corrida multi-tab do S5-RACE)", async () => {
    const repo = makeRepo();
    const seeded = initialProgress();
    await repo.save(seeded);

    // Duas transações readwrite concorrentes (abas distintas): cada mutate
    // deve ler o estado commitado pelo outro — +25 + +25 = +50, sem colapso
    // last-write.
    await Promise.all([
      repo.update((current) => {
        if (!current) throw new Error("estado ausente");
        return { ...current, xp: current.xp + 25 };
      }),
      repo.update((current) => {
        if (!current) throw new Error("estado ausente");
        return { ...current, xp: current.xp + 25 };
      }),
    ]);

    const final = await repo.load();
    expect(final?.xp).toBe(seeded.xp + 50);
  });

  it("erro no mutate aborta a transação, repassa a exceção ORIGINAL e não persiste nada", async () => {
    const repo = makeRepo();
    const seeded = initialProgress();
    await repo.save(seeded);
    const boom = new Error("mutate inválido");

    await expect(
      repo.update((current) => {
        void current;
        throw boom;
      }),
    ).rejects.toBe(boom);

    // Estado persistido permanece o pré-chamada (abort limpo).
    const after = await repo.load();
    expect(after?.xp).toBe(seeded.xp);
  });
});
