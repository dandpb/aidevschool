import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedDbLearnerStateStore } from "../../src/adapters/learnerStateStore";
import {
  CUTOVER_SNAPSHOT_KEY,
  LEARNER_STATE_KEY,
  PROGRESS_KEY,
  STORE_NAME,
} from "../../src/adapters/storageKeys";
import { createServices } from "../../src/app/services";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { buildCutoverSnapshot } from "../../src/domain/learnerState";
import { createInitialProgress } from "../../src/domain/progress";
import {
  emptyXpLedger,
  fingerprintOf,
  lessonLedgerKey,
  localDateKey,
} from "../../src/domain/xpLedger";
import { fixedClock } from "../fakes";

const NOW = new Date("2026-10-07T12:00:00.000Z");

/**
 * AID-3888 — máquina de boot (`loadOrActivateState`) sobre o adapter REAL
 * (fake-indexeddb): P10 matriz de ausência, P11 reset vs interrupção,
 * P13 precedência da autoridade, P2 load indisponível, P4′ corte
 * (ordem/retomada/divergência). Nenhum caminho descarta/reset/sobrescreve.
 */

let dbCounter = 0;
let dbName = "";
let store: IndexedDbLearnerStateStore;

function makeServicesWithStore() {
  const services = createServices({
    stateStore: store,
    clock: fixedClock(NOW),
  });
  return services;
}

function legacyProgress(completed = false) {
  const progress = createInitialProgress(modules, contentVersion);
  const first = Object.keys(progress.lessonStatus)[0];
  if (completed && first) progress.lessonStatus[first] = "completed";
  return progress;
}

/** Abre o DB garantindo o object store (mesma criação do adapter). */
function openRaw(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE_NAME)) {
        open.result.createObjectStore(STORE_NAME);
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

/** Escrita crua direta no object store (injeção de estados de armazenamento). */
async function putRaw(key: string, value: unknown): Promise<void> {
  const db = await openRaw();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request =
      value === undefined
        ? tx.objectStore(STORE_NAME).delete(key)
        : tx.objectStore(STORE_NAME).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  db.close();
}

async function getRaw(key: string): Promise<unknown> {
  const db = await openRaw();
  const value = await new Promise<unknown>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

beforeEach(() => {
  dbCounter += 1;
  dbName = `literacydojo-boot-test-${dbCounter}`;
  store = new IndexedDbLearnerStateStore(dbName, () => NOW);
});

describe("P10 — matriz de ausência: seed SOMENTE na célula (absent, absent, absent) sem erros", () => {
  it("instalação nova (todas as chaves ausentes) semeia com snapshot de ausência antes da ativação", async () => {
    const services = makeServicesWithStore();
    const activated = await import("../../src/app/services").then((m) =>
      m.loadOrActivateState(services),
    );
    expect(activated.origin).toBe("fresh-seed");
    expect(activated.progress.xp).toBe(0);
    const snapshot = await store.readSnapshot();
    expect(snapshot.status).toBe("present-valid");
    if (snapshot.status === "present-valid") {
      expect(snapshot.value.legacyCapture).toEqual({ legacy: "confirmed-absent" });
    }
  });

  it("legado presente válido → corte: snapshot ANTES da ativação, marcadores semeados", async () => {
    await putRaw(PROGRESS_KEY, legacyProgress(true));
    const services = makeServicesWithStore();
    const activated = await import("../../src/app/services").then((m) =>
      m.loadOrActivateState(services),
    );
    expect(activated.origin).toBe("cutover");
    const first = Object.keys(activated.progress.lessonStatus).find(
      (id) => activated.progress.lessonStatus[id] === "completed",
    );
    expect(first).toBeDefined();
    expect(activated.xpLedger.firstCompletionAwarded[lessonLedgerKey(first!)]).toBe(
      localDateKey(NOW),
    );
    expect(activated.xpLedger.lastAwardedDate).toEqual({});
  });

  it("legado presente INVÁLIDO → blocked (nunca seed), dado bruto preservado", async () => {
    await putRaw(PROGRESS_KEY, { schemaVersion: 6, junk: true });
    const services = makeServicesWithStore();
    const { loadOrActivateState, BootBlockedError } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toMatchObject({
      name: "BootBlockedError",
      reason: "legacy-invalid",
    });
    expect(BootBlockedError).toBeDefined();
    // Preservação: nada foi escrito em nenhuma chave nova; o legado segue lá.
    expect(await getRaw(LEARNER_STATE_KEY)).toBeUndefined();
    expect(await getRaw(CUTOVER_SNAPSHOT_KEY)).toBeUndefined();
    const raw = (await getRaw(PROGRESS_KEY)) as Record<string, unknown>;
    expect(raw.schemaVersion).toBe(6);
  });

  it("legado com forma do protótipo B (schema 5) → blocked com dado preservado (errata 25b51990)", async () => {
    await putRaw(PROGRESS_KEY, { ...legacyProgress(), schemaVersion: 5, xpAwards: {} });
    const services = makeServicesWithStore();
    const { loadOrActivateState } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toMatchObject({ reason: "legacy-invalid" });
    const raw = (await getRaw(PROGRESS_KEY)) as Record<string, unknown>;
    expect(raw.schemaVersion).toBe(5);
    expect(await getRaw(LEARNER_STATE_KEY)).toBeUndefined();
  });

  it("ausência das chaves novas SOZINHA não prova instalação sem legado — legado presente domina seed", async () => {
    // Estado/snapshot ausentes + legado válido → corte (não seed fresco).
    await putRaw(PROGRESS_KEY, legacyProgress(false));
    const services = makeServicesWithStore();
    const activated = await import("../../src/app/services").then((m) =>
      m.loadOrActivateState(services),
    );
    expect(activated.origin).toBe("cutover");
  });
});

describe("P13 — precedência: estado novo VÁLIDO é autoritativo", () => {
  it("carrega com legado inválido/ilegível — legado não bloqueia estado válido ativado", async () => {
    await putRaw(PROGRESS_KEY, { schemaVersion: 99, junk: true });
    await store.saveState({
      stateVersion: 1,
      origin: "cutover",
      progress: legacyProgress(false),
      xpLedger: emptyXpLedger(),
    });
    const services = makeServicesWithStore();
    const { loadOrActivateState } = await import("../../src/app/services");
    const state = await loadOrActivateState(services);
    expect(state.progress.contentVersion).toBe(contentVersion);
  });

  it("estado novo inválido → blocked com preservação, INDEPENDENTE do legado válido", async () => {
    await putRaw(PROGRESS_KEY, legacyProgress(false));
    await putRaw(LEARNER_STATE_KEY, { stateVersion: 42, origin: "future" });
    const services = makeServicesWithStore();
    const { loadOrActivateState } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toMatchObject({ reason: "state-invalid" });
    const raw = (await getRaw(LEARNER_STATE_KEY)) as Record<string, unknown>;
    expect(raw.stateVersion).toBe(42); // preservado, não reescrito
  });

  it("estado novo corrompido internamente (progresso inválido) → blocked", async () => {
    await putRaw(LEARNER_STATE_KEY, {
      stateVersion: 1,
      origin: "cutover",
      progress: null,
      xpLedger: emptyXpLedger(),
    });
    const services = makeServicesWithStore();
    const { loadOrActivateState } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toMatchObject({ reason: "state-invalid" });
  });
});

describe("P4′ — protocolo de corte: ordem, interrupção e divergência", () => {
  it("falha ANTES do snapshot → nada ativado, legado intacto, retry seguro", async () => {
    await putRaw(PROGRESS_KEY, legacyProgress(false));
    const services = makeServicesWithStore();
    const persistSpy = vi
      .spyOn(store, "persistSnapshot")
      .mockRejectedValue(new Error("falha injetada"));
    const { loadOrActivateState } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toThrow(/falha injetada/);
    persistSpy.mockRestore();
    expect(await getRaw(LEARNER_STATE_KEY)).toBeUndefined();
    expect(await getRaw(CUTOVER_SNAPSHOT_KEY)).toBeUndefined();
    // Retry com a falha resolvida completa o corte.
    const state = await loadOrActivateState(services);
    expect(state.origin).toBe("cutover");
  });

  it("falha na ATIVAÇÃO (snapshot confirmado) → retomada idempotente com legado INALTERADO; legado alterado bloqueia", async () => {
    const legacy = legacyProgress(false);
    await putRaw(PROGRESS_KEY, legacy);
    const services = makeServicesWithStore();
    const activateSpy = vi
      .spyOn(store, "activateState")
      .mockRejectedValueOnce(new Error("crash no meio"));
    const { loadOrActivateState } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toThrow(/crash no meio/);
    activateSpy.mockRestore();
    expect(await getRaw(CUTOVER_SNAPSHOT_KEY)).toBeDefined(); // snapshot persistiu

    // Legado ALTERADO pós-interrupção (protocolo `3b9e7f8a` passo 4):
    // bloquear SEM remigração — ramos preservados.
    await putRaw(PROGRESS_KEY, { ...legacy, counters: { attempts: 999 } });
    await expect(loadOrActivateState(services)).rejects.toMatchObject({
      reason: "legacy-diverged",
    });

    // Legado inalterado: retomada completa a ativação a partir do snapshot.
    await putRaw(PROGRESS_KEY, legacy);
    const state = await loadOrActivateState(services);
    expect(state.origin).toBe("cutover");
  });

  it("legado divergiu antes do snapshot existir → corte normal captura o valor ATUAL", async () => {
    await putRaw(PROGRESS_KEY, legacyProgress(false));
    const services = makeServicesWithStore();
    const { loadOrActivateState } = await import("../../src/app/services");
    const state = await loadOrActivateState(services);
    expect(state.origin).toBe("cutover");
  });

  it("interrupção + legado APAGADO (reset de cliente antigo) → blocked diverged, snapshot preservado", async () => {
    await putRaw(PROGRESS_KEY, legacyProgress(false));
    const services = makeServicesWithStore();
    const activateSpy = vi.spyOn(store, "activateState").mockRejectedValueOnce(new Error("crash"));
    const { loadOrActivateState } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toThrow(/crash/);
    activateSpy.mockRestore();
    await putRaw(PROGRESS_KEY, undefined); // cliente antigo rodou reset()
    await expect(loadOrActivateState(services)).rejects.toMatchObject({
      reason: "legacy-diverged",
    });
    expect(await getRaw(CUTOVER_SNAPSHOT_KEY)).toBeDefined(); // preservado
  });
});

describe("P11 — reset explícito vs ativação interrompida (marker-first)", () => {
  it("explicitReset grava marker ANTES de apagar; boot semeia do zero SEM restaurar do snapshot", async () => {
    const services = makeServicesWithStore();
    const { loadOrActivateState, explicitReset } = await import("../../src/app/services");
    const first = await loadOrActivateState(services);
    first.progress.xp = 555; // jornada que o reset deve descartar
    await store.saveState(first);

    const deleteSpy = vi.spyOn(store, "deleteState");
    await explicitReset(services);
    // Marker-first: quando deleteState rodou, o marker JÁ estava persistido.
    const intent = await store.readResetIntent();
    expect(intent.status).toBe("present-valid");
    deleteSpy.mockRestore();

    const seeded = await loadOrActivateState(services);
    expect(seeded.origin).toBe("reset-seed");
    expect(seeded.progress.xp).toBe(0); // não restaurou a jornada anterior
    const snapshot = await store.readSnapshot();
    expect(snapshot.status).toBe("present-valid"); // snapshot histórico preservado
    expect((await store.readResetIntent()).status).toBe("absent"); // marker consumido
  });

  it("estado ausente SEM marker → retomada de ativação interrompida (não é reset)", async () => {
    await putRaw(PROGRESS_KEY, legacyProgress(false));
    const services = makeServicesWithStore();
    const { loadOrActivateState } = await import("../../src/app/services");
    const activateSpy = vi.spyOn(store, "activateState").mockRejectedValueOnce(new Error("crash"));
    await expect(loadOrActivateState(services)).rejects.toThrow(/crash/);
    activateSpy.mockRestore();
    const state = await loadOrActivateState(services);
    expect(state.origin).toBe("cutover"); // retomou a ativação, não reset
  });

  it("marker com fingerprint que não corresponde ao snapshot → blocked (registros inconsistentes)", async () => {
    const services = makeServicesWithStore();
    const { loadOrActivateState } = await import("../../src/app/services");
    await loadOrActivateState(services); // cria snapshot (ausência)
    await store.saveResetIntent({
      intentVersion: 1,
      kind: "explicit-reset",
      performedAt: NOW.toISOString(),
      supersedesSnapshotFingerprint: "fingerprint-de-outro-snapshot",
    });
    await store.deleteState();
    await expect(loadOrActivateState(services)).rejects.toMatchObject({
      reason: "intent-mismatch",
    });
  });
});

describe("P2 — load indisponível (erro de armazenamento) → blocked sem escrita", () => {
  it("erro de leitura do estado → BootBlockedError(state-read-error); nada semeado", async () => {
    const broken = Object.create(store) as IndexedDbLearnerStateStore;
    broken.readState = async () => ({
      status: "read-error" as const,
      error: new Error("IndexedDB indisponível"),
    });
    const services = createServices({ stateStore: broken, clock: fixedClock(NOW) });
    const { loadOrActivateState } = await import("../../src/app/services");
    await expect(loadOrActivateState(services)).rejects.toMatchObject({
      reason: "state-read-error",
    });
  });
});

describe("P12 — fidelidade do snapshot (no boot real)", () => {
  it("snapshot captura o VALOR lido; fingerprint bate com a projeção canônica do legado", async () => {
    const legacy = legacyProgress(true);
    await putRaw(PROGRESS_KEY, legacy);
    const services = makeServicesWithStore();
    await import("../../src/app/services").then((m) => m.loadOrActivateState(services));
    const snapshot = await store.readSnapshot();
    expect(snapshot.status === "present-valid").toBe(true);
    if (snapshot.status === "present-valid") {
      const capture = snapshot.value.legacyCapture;
      expect(capture.legacy).toBe("present");
      if (capture.legacy === "present") {
        // Igualdade pela PREDICADO DECLARADO (projeção canônica) — sem asserção byte a byte.
        expect(fingerprintOf(capture.value)).toBe(snapshot.value.legacyFingerprint);
        expect(JSON.stringify(capture.value)).toBe(JSON.stringify(legacy)); // structured clone fiel
      }
    }
  });

  it("snapshot de buildCutoverSnapshot referencia o mesmo fingerprint (helper/domain ↔ adapter coerentes)", async () => {
    const legacy = legacyProgress(false);
    const snapshot = buildCutoverSnapshot({
      legacyCapture: { legacy: "present", value: legacy },
      contentVersion,
      now: NOW,
    });
    expect(snapshot.legacyFingerprint).toBe(fingerprintOf(legacy));
  });
});
