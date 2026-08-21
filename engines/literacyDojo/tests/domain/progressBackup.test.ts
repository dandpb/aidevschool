import { describe, expect, it } from "vitest";
import { contentVersion, modules } from "../../src/data/generated/lessons";
import { UnmigratableProgressError } from "../../src/domain/migration";
import { PROGRESS_SCHEMA_VERSION, createInitialProgress } from "../../src/domain/progress";
import {
  capLessonStatus,
  parseImportedProgress,
  serializeProgressForExport,
} from "../../src/domain/progressBackup";

describe("progress backup (export/import)", () => {
  it("exporta JSON sem mastered e reimporta via migrateProgress", () => {
    const progress = createInitialProgress(modules, contentVersion);
    const firstReady = Object.keys(progress.lessonStatus)[0];
    progress.lessonStatus[firstReady] = "completed";
    progress.xp = 40;

    const json = serializeProgressForExport(progress);
    expect(json).not.toContain("mastered");
    expect(json).toContain('"completed"');

    const imported = parseImportedProgress(json, contentVersion);
    expect(imported.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
    expect(imported.lessonStatus[firstReady]).toBe("completed");
    expect(imported.xp).toBe(40);
    expect(JSON.stringify(imported)).not.toContain("mastered");
  });

  it("capeia mastered para completed no import", () => {
    const progress = createInitialProgress(modules, contentVersion);
    const firstReady = Object.keys(progress.lessonStatus)[0];
    const raw = {
      ...progress,
      lessonStatus: { ...progress.lessonStatus, [firstReady]: "mastered" },
    };

    const imported = parseImportedProgress(raw, contentVersion);
    expect(imported.lessonStatus[firstReady]).toBe("completed");
    expect(capLessonStatus("mastered")).toBe("completed");
  });

  it("migra backup schemaVersion 2 no import", () => {
    const progress = createInitialProgress(modules, contentVersion);
    const legacy = { ...progress, schemaVersion: 2 };
    const imported = parseImportedProgress(JSON.stringify(legacy), contentVersion);
    expect(imported.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
  });

  it("rejeita JSON inválido sem persistir", () => {
    expect(() => parseImportedProgress("{", contentVersion)).toThrow(UnmigratableProgressError);
    expect(() => parseImportedProgress(null, contentVersion)).toThrow(UnmigratableProgressError);
  });
});
