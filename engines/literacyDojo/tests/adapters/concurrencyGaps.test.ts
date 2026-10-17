import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDbLearnerStateStore } from "../../src/adapters/learnerStateStore";
import { LEARNER_STATE_KEY, STORE_NAME } from "../../src/adapters/storageKeys";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { createInitialProgress } from "../../src/domain/progress";
import { emptyXpLedger } from "../../src/domain/xpLedger";

/**
 * AID-3888 — P7′ (lacuna declarada, decisão PO `b8f22a28` item 4): o
 * IndexedDB NÃO tem CAS — duas abas do cliente novo convergem para
 * last-write-wins na chave do estado. Esta prova documental-executável fixa
 * o comportamento REAL como limite conhecido (não resolvido nesta fatia;
 * proposta futura: single-writer via Web Locks). Sem auto-merge: a última
 * gravação vence integralmente — nunca soma de XP entre escritores.
 */

let dbCounter = 0;
let dbName = "";
let store: IndexedDbLearnerStateStore;

function state(xp: number) {
  const progress = createInitialProgress(modules, contentVersion);
  progress.xp = xp;
  return {
    stateVersion: 1 as const,
    origin: "cutover" as const,
    progress,
    xpLedger: emptyXpLedger(),
  };
}

function getRaw(): Promise<unknown> {
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
        .get(LEARNER_STATE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    };
    open.onerror = () => reject(open.error);
  });
}

beforeEach(() => {
  dbCounter += 1;
  dbName = `literacydojo-concurrency-${dbCounter}`;
  store = new IndexedDbLearnerStateStore(dbName);
});

describe("P7′ — concorrência entre abas: last-write-wins declarado (lacuna aberta)", () => {
  it("duas gravações concorrentes: a última vence INTEGRALMENTE (sem soma/mescla de XP)", async () => {
    await store.saveState(state(100));
    await store.saveState(state(200)); // aba B grava depois
    const raw = (await getRaw()) as { progress: { xp: number } };
    expect(raw.progress.xp).toBe(200); // nunca 300
  });

  it("put de registro único é atômico: leitura intermediária vê um estado completo (velho ou novo)", async () => {
    await store.saveState(state(10));
    const writes = Promise.all([store.saveState(state(20)), store.saveState(state(30))]);
    const read = await store.readState();
    await writes;
    if (read.status !== "present-valid")
      throw new Error(`leitura parcial: ${JSON.stringify(read)}`);
    expect([10, 20, 30]).toContain(read.value.progress.xp);
  });
});
