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

  it("retrofit O3-C1 (A1): l01 concluída só com a1 permanece completed após o bump de contentVersion", () => {
    // Learner que concluiu l01 na versão de 1 atividade (2026-09-02.2):
    // o bump para o catálogo de 3 atividades NÃO rebaixa o status persistido
    // (grandfathering, regra 4 / spec AID-644 rev 2 §1.3).
    const progress = createInitialProgress(modules, "2026-09-02.2");
    progress.lessonStatus.l01 = "completed";
    progress.currentLessonId = "l02";
    const migrated = migrateProgress(progress, contentVersion);
    expect(migrated.contentVersion).toBe(contentVersion);
    expect(migrated.lessonStatus.l01).toBe("completed");
    expect(migrated.currentLessonId).toBe("l02");
  });

  it("retrofit O3-C1 (A2): skills praticadas ficam com revisão devida imediatamente no bump", () => {
    const progress = createInitialProgress(modules, "2026-09-02.2");
    progress.lessonStatus.l01 = "completed";
    progress.skills.entender = {
      skillId: "entender",
      attempts: 1,
      passes: 1,
      lastScore: 1,
      lastPracticedAt: "2026-09-01T10:00:00.000Z",
      nextReviewAt: "2026-10-01T10:00:00.000Z",
    };
    const now = new Date("2026-09-02T15:00:00.000Z");
    const migrated = migrateProgress(progress, contentVersion, now);
    expect(migrated.skills.entender?.nextReviewAt).toBe(now.toISOString());
  });

  it("progresso da versão 2 recebe os campos do Mapa Inicial sem perder histórico", () => {
    const progress = createInitialProgress(modules, contentVersion);
    const legacy = { ...progress, schemaVersion: 2 };
    const migrated = migrateProgress(legacy, contentVersion);
    expect(migrated.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
    expect(migrated.onboarding.mapInitial).toBeUndefined();
    expect(migrated.lessonStatus).toEqual(progress.lessonStatus);
  });

  it("reabre no Mapa Inicial quando o onboarding legado ainda não teve nenhuma lição", () => {
    const progress = createInitialProgress(modules, contentVersion);
    const legacy = {
      ...progress,
      schemaVersion: 2,
      onboarding: { completed: true },
    };
    const migrated = migrateProgress(legacy, contentVersion);
    expect(migrated.currentLessonId).toBe("l02");
    expect(migrated.lessonStatus.l01).toBe("locked");
    expect(migrated.lessonStatus.l02).toBe("available");
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
