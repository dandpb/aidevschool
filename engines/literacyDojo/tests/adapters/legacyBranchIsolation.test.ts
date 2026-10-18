import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDbProgressRepository } from "../../src/adapters/indexedDbProgressRepository";
import { IndexedDbLearnerStateStore } from "../../src/adapters/learnerStateStore";
import {
  CUTOVER_SNAPSHOT_KEY,
  LEARNER_STATE_KEY,
  PROGRESS_KEY,
  STORE_NAME,
} from "../../src/adapters/storageKeys";
import { createServices } from "../../src/app/services";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { createInitialProgress } from "../../src/domain/progress";
import { emptyXpLedger } from "../../src/domain/xpLedger";
import { fixedClock } from "../fakes";

const NOW = new Date("2026-10-07T12:00:00.000Z");

/**
 * AID-3888 — P6′/P9: o cliente antigo (IndexedDbProgressRepository, que só
 * conhece PROGRESS_KEY) coexiste com o estado novo. Critério PO (`8b42a157`):
 * salvar/resetar no cliente antigo NÃO altera o estado novo; reabrir a
 * versão nova mantém exatamente seu último progresso, XP e ledger. Ramos
 * divergentes coexistem — sem sobrescrita, remigração ou soma automática.
 */

let dbCounter = 0;
let dbName = "";
let store: IndexedDbLearnerStateStore;
let legacyRepo: IndexedDbProgressRepository;

function getRaw(key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE_NAME))
        open.result.createObjectStore(STORE_NAME);
    };
    open.onsuccess = () => {
      const request = open.result
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    };
    open.onerror = () => reject(open.error);
  });
}

beforeEach(() => {
  dbCounter += 1;
  dbName = `literacydojo-legacy-iso-${dbCounter}`;
  store = new IndexedDbLearnerStateStore(dbName, () => NOW);
  legacyRepo = new IndexedDbProgressRepository(dbName);
});

describe("P6′ — critério PO: escritas do cliente antigo não alteram o estado novo", () => {
  it("save do cliente antigo (só PROGRESS_KEY) deixa estado novo e snapshot intactos; nova versão retoma exatamente", async () => {
    // Cliente novo ativa primeiro (corte do legado).
    const legacy = createInitialProgress(modules, contentVersion);
    await legacyRepo.save(legacy);
    const services = createServices({ stateStore: store, clock: fixedClock(NOW) });
    const { loadOrActivateState } = await import("../../src/app/services");
    const activated = await loadOrActivateState(services);
    activated.progress.xp = 777;
    activated.progress.counters = { attempts: 42 };
    await store.saveState(activated);
    const stateBefore = await getRaw(LEARNER_STATE_KEY);
    const snapshotBefore = await getRaw(CUTOVER_SNAPSHOT_KEY);

    // Cliente ANTIGO salva por cima do legado (divergência de ramos).
    await legacyRepo.save({ ...legacy, counters: { attempts: 999 } });

    // Critério: estado novo e snapshot byte-idênticos (structured clone).
    expect(await getRaw(LEARNER_STATE_KEY)).toEqual(stateBefore);
    expect(await getRaw(CUTOVER_SNAPSHOT_KEY)).toEqual(snapshotBefore);

    // Reabrir a versão nova mantém exatamente seu último progresso/XP/ledger.
    const resumed = await loadOrActivateState(services);
    expect(resumed.progress.xp).toBe(777);
    expect(resumed.progress.counters.attempts).toBe(42);
    expect(resumed.xpLedger).toEqual(activated.xpLedger);
  });

  it("reset do cliente antigo (apaga SÓ a chave legada) não altera estado novo/snapshot", async () => {
    const services = createServices({ stateStore: store, clock: fixedClock(NOW) });
    const { loadOrActivateState } = await import("../../src/app/services");
    const activated = await loadOrActivateState(services);
    await store.saveState({ ...activated, progress: { ...activated.progress, xp: 55 } });
    const stateBefore = await getRaw(LEARNER_STATE_KEY);

    await legacyRepo.reset(); // cliente antigo "limpa dados"

    expect(await getRaw(LEARNER_STATE_KEY)).toEqual(stateBefore);
    expect(await getRaw(CUTOVER_SNAPSHOT_KEY)).toBeDefined();
    const resumed = await loadOrActivateState(services);
    expect(resumed.progress.xp).toBe(55);
  });
});

describe("P9 — ramos divergentes coexistem (sem merge/soma automática)", () => {
  it("XP ganho no cliente antigo NÃO soma no estado novo; ledgers/progressos seguem independentes", async () => {
    const legacy = createInitialProgress(modules, contentVersion);
    await legacyRepo.save(legacy);
    const services = createServices({ stateStore: store, clock: fixedClock(NOW) });
    const { loadOrActivateState } = await import("../../src/app/services");
    const activated = await loadOrActivateState(services);
    expect(activated.origin).toBe("cutover");

    // Ramo antigo evolui isoladamente (XP attempt-granular do legado).
    const evolved = { ...legacy, xp: legacy.xp + 500 };
    await legacyRepo.save(evolved);

    // O cliente novo NÃO re-migra nem soma: estado autoritativo segue o seu.
    const resumed = await loadOrActivateState(services);
    expect(resumed.progress.xp).toBe(activated.progress.xp);
    expect(await legacyRepo.load()).toMatchObject({ xp: legacy.xp + 500 }); // ramo legado preservado
  });

  it("import não toca o ramo legado (grava somente o estado novo)", async () => {
    const legacy = createInitialProgress(modules, contentVersion);
    await legacyRepo.save(legacy);
    const services = createServices({ stateStore: store, clock: fixedClock(NOW) });
    const { loadOrActivateState } = await import("../../src/app/services");
    await loadOrActivateState(services);
    const legacyBefore = await getRaw(PROGRESS_KEY);

    await services.useCases.importProgress(
      JSON.stringify({
        format: "literacydojo-backup",
        formatVersion: 2,
        progress: createInitialProgress(modules, contentVersion),
        xpLedger: emptyXpLedger(),
      }),
    );

    expect(await getRaw(PROGRESS_KEY)).toEqual(legacyBefore); // ramo legado intocado
  });
});
