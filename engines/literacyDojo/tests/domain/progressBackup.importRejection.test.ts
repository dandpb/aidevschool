import { describe, expect, it } from "vitest";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { UnmigratableProgressError } from "../../src/domain/migration";
import { createInitialProgress } from "../../src/domain/progress";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  parseImportedBackup,
  serializeBackupForExport,
} from "../../src/domain/progressBackup";
import { emptyXpLedger, lessonLedgerKey, localDateKey } from "../../src/domain/xpLedger";

const NOW = new Date("2026-10-07T12:00:00.000Z");

function stateFixture() {
  return {
    stateVersion: 1 as const,
    origin: "fresh-seed" as const,
    progress: createInitialProgress(modules, contentVersion),
    xpLedger: emptyXpLedger(),
  };
}

describe("AID-3888 — envelope v2 (P1: import rejeita integralmente antes de persistir)", () => {
  it("export emite envelope com forma/versão explícitas + ledger", () => {
    const state = stateFixture();
    const json = serializeBackupForExport(state);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(parsed.progress.schemaVersion).toBe(4);
    expect(parsed.xpLedger).toEqual(emptyXpLedger());
    expect(json).not.toContain("mastered");
  });

  it("envelope v2 válido reimporta com XP total e progresso preservados (sem recálculo pelo ledger)", () => {
    const state = stateFixture();
    state.progress.xp = 1234; // total histórico preservado — ledger não recalcula
    state.xpLedger = {
      ledgerVersion: 1,
      lastAwardedDate: {},
      firstCompletionAwarded: { [lessonLedgerKey("l02")]: localDateKey(NOW) },
    };
    const restored = parseImportedBackup(serializeBackupForExport(state), contentVersion, NOW);
    expect(restored.progress.xp).toBe(1234);
    expect(restored.xpLedger).toEqual(state.xpLedger);
    expect(restored.origin).toBe("import");
  });

  it("JSON corrompido rejeita", () => {
    expect(() => parseImportedBackup("{", contentVersion, NOW)).toThrow(/JSON inválido/);
  });

  it("formato desconhecido/futuro rejeita com reason tipado", () => {
    expect(() =>
      parseImportedBackup(
        { format: "other-app", formatVersion: 9, progress: {}, xpLedger: {} },
        contentVersion,
        NOW,
      ),
    ).toThrow(UnmigratableProgressError);
  });

  it("envelope v2 sem ledger / com ledger null é ERRO — não autorização para esvaziá-lo", () => {
    const state = stateFixture();
    const envelope = JSON.parse(serializeBackupForExport(state));
    const { xpLedger: _removed, ...withoutLedger } = envelope;
    void _removed;
    expect(() => parseImportedBackup(withoutLedger, contentVersion, NOW)).toThrow(
      /xpLedger ausente\/null/,
    );
    const withNullLedger = { ...withoutLedger, xpLedger: null };
    expect(() => parseImportedBackup(withNullLedger, contentVersion, NOW)).toThrow(
      /xpLedger ausente\/null/,
    );
  });

  it("ledger com forma inválida (chave/data/versão) rejeita integralmente", () => {
    const state = stateFixture();
    const envelope = JSON.parse(serializeBackupForExport(state));
    envelope.xpLedger = {
      ledgerVersion: 1,
      lastAwardedDate: { "chave-malformada": "2026-10-07" },
      firstCompletionAwarded: {},
    };
    expect(() => parseImportedBackup(envelope, contentVersion, NOW)).toThrow(
      /Ledger de XP inválido/,
    );
    envelope.xpLedger = {
      ledgerVersion: 1,
      lastAwardedDate: { "activity:l02:a1": "garbage" },
      firstCompletionAwarded: {},
    };
    expect(() => parseImportedBackup(envelope, contentVersion, NOW)).toThrow(/data inválida/);
    envelope.xpLedger = { ledgerVersion: 7, lastAwardedDate: {}, firstCompletionAwarded: {} };
    expect(() => parseImportedBackup(envelope, contentVersion, NOW)).toThrow(/ledgerVersion 7/);
  });

  it("backup schema-5-in-record (protótipo B) rejeita com reason prototype-schema-5 — nunca cast silencioso", () => {
    const state = stateFixture();
    const protoB = { ...state.progress, schemaVersion: 5, xpAwards: {} };
    try {
      parseImportedBackup(protoB, contentVersion, NOW);
      expect.unreachable("deve rejeitar");
    } catch (error) {
      expect(error).toBeInstanceOf(UnmigratableProgressError);
      expect((error as UnmigratableProgressError).reason).toBe("prototype-schema-5");
    }
  });

  it("registro legado único schema 4 é aceito e ganha ledger pela semântica de corte", () => {
    const state = stateFixture();
    const legacy = { ...state.progress, lessonStatus: { ...state.progress.lessonStatus } };
    const first = Object.keys(legacy.lessonStatus)[0];
    if (first) legacy.lessonStatus[first] = "completed";
    const restored = parseImportedBackup(legacy, contentVersion, NOW);
    expect(restored.progress.lessonStatus[first]).toBe("completed");
    expect(restored.xpLedger.firstCompletionAwarded[lessonLedgerKey(first)]).toBe(
      localDateKey(NOW),
    );
    expect(restored.xpLedger.lastAwardedDate).toEqual({});
  });

  it("registro legado com status inválido rejeita (cap mastered→completed permanece, resto rejeita)", () => {
    const state = stateFixture();
    const legacy = {
      ...state.progress,
      lessonStatus: { ...state.progress.lessonStatus, l01: "weird" },
    };
    expect(() => parseImportedBackup(legacy, contentVersion, NOW)).toThrow(
      /status de lição inválido/,
    );
  });
});
