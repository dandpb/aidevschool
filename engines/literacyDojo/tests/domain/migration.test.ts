import { describe, expect, it } from "vitest";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { UnmigratableProgressError, migrateProgress } from "../../src/domain/migration";
import { PROGRESS_SCHEMA_VERSION, createInitialProgress } from "../../src/domain/progress";

describe("migrateProgress (forward-only)", () => {
  it("estado válido da versão atual passa intacto", () => {
    const progress = createInitialProgress(modules, contentVersion);
    expect(migrateProgress(progress, contentVersion)).toEqual(progress);
  });

  it("contentVersion nova: completed permanece, versão do conteúdo é atualizada", () => {
    const progress = createInitialProgress(modules, "2026-01-01.0");
    const firstReady = Object.keys(progress.lessonStatus)[0];
    progress.lessonStatus[firstReady] = "completed";
    const migrated = migrateProgress(progress, contentVersion);
    expect(migrated.contentVersion).toBe(contentVersion);
    expect(migrated.lessonStatus[firstReady]).toBe("completed");
  });

  it("schemaVersion desconhecida não migra — erro explícito, sem fallback silencioso", () => {
    const progress = createInitialProgress(modules, contentVersion);
    expect(() =>
      migrateProgress({ ...progress, schemaVersion: PROGRESS_SCHEMA_VERSION + 1 }, contentVersion),
    ).toThrow(UnmigratableProgressError);
    expect(() => migrateProgress({ ...progress, schemaVersion: 0 }, contentVersion)).toThrow(
      UnmigratableProgressError,
    );
  });

  it("lixo persistido é rejeitado", () => {
    expect(() => migrateProgress(null, contentVersion)).toThrow(UnmigratableProgressError);
    expect(() => migrateProgress("texto", contentVersion)).toThrow(UnmigratableProgressError);
    expect(() => migrateProgress({ schemaVersion: 1 }, contentVersion)).toThrow(
      UnmigratableProgressError,
    );
  });
});
