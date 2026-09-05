import { afterEach, describe, expect, it } from "vitest";
import {
  loadRetrofitAcks,
  resetRetrofitAcks,
  saveRetrofitAck,
} from "../../src/adapters/retrofitAcks";
import { RETROFIT_ACKS_KEY } from "../../src/adapters/storageKeys";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

afterEach(() => {
  window.localStorage.clear();
});

describe("retrofitAcks (persistência local estruturada, O3-C1 §3)", () => {
  it("chave estruturada lessonId → contentVersion, sem texto livre", () => {
    const storage = new MemoryStorage();
    saveRetrofitAck("l01", "2026-09-02.3", storage);
    const raw = storage.getItem(RETROFIT_ACKS_KEY);
    expect(raw).toBe(JSON.stringify({ l01: "2026-09-02.3" }));
    expect(loadRetrofitAcks(storage)).toEqual({ l01: "2026-09-02.3" });
  });

  it("idempotência: regravar a mesma versão não acumula estado (A5)", () => {
    const storage = new MemoryStorage();
    saveRetrofitAck("l01", "2026-09-02.3", storage);
    saveRetrofitAck("l01", "2026-09-02.3", storage);
    expect(loadRetrofitAcks(storage)).toEqual({ l01: "2026-09-02.3" });
    saveRetrofitAck("l02", "2026-09-02.3", storage);
    expect(loadRetrofitAcks(storage)).toEqual({ l01: "2026-09-02.3", l02: "2026-09-02.3" });
    saveRetrofitAck("l01", "2099-01-01.1", storage);
    expect(loadRetrofitAcks(storage)).toEqual({ l01: "2099-01-01.1", l02: "2026-09-02.3" });
  });

  it("reset apaga os acks (recomeço do zero limpa o aviso)", () => {
    const storage = new MemoryStorage();
    saveRetrofitAck("l03", "2026-09-02.3", storage);
    resetRetrofitAcks(storage);
    expect(loadRetrofitAcks(storage)).toEqual({});
  });

  it("estado corrompido degrada para vazio sem lançar (best-effort)", () => {
    window.localStorage.setItem(RETROFIT_ACKS_KEY, "não é json");
    expect(loadRetrofitAcks()).toEqual({});
    window.localStorage.setItem(RETROFIT_ACKS_KEY, JSON.stringify(["l01"]));
    expect(loadRetrofitAcks()).toEqual({});
    window.localStorage.setItem(RETROFIT_ACKS_KEY, JSON.stringify({ l01: 7, l02: "2026-09-02.3" }));
    expect(loadRetrofitAcks()).toEqual({ l02: "2026-09-02.3" });
  });
});
