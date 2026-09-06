import { describe, expect, it } from "vitest";
import { lessons, modules } from "../../src/data/generated/lessons";
import {
  CHECKPOINT_ACTIVATION,
  CHECKPOINT_MINIMUM_SCORE,
  CHECKPOINT_SELECTION,
  completeCheckpointSession,
  evaluateCheckpointOutcome,
  firstReadyLessonOfModule,
  isCheckpointAvailable,
  isCheckpointCompleted,
  isLessonGateLocked,
  lastReadyLessonOfModule,
  startCheckpointSession,
} from "../../src/domain/checkpoints";
import {
  type LearnerProgress,
  PROGRESS_SCHEMA_VERSION,
  createInitialProgress,
  unlockNextReadyLesson,
} from "../../src/domain/progress";
import { FIXED_NOW } from "../helpers";

const NOW = FIXED_NOW;

/** Percurso público do app standalone (jornada ia_pratica), como o adapter filtra. */
const publicModules = modules.filter((module) => module.journey === "ia_pratica");

/** Progresso com as lições dadas concluídas (na ordem), corrente de desbloqueio coerente. */
function progressWithCompleted(completedIds: string[]): LearnerProgress {
  const progress = createInitialProgress(publicModules, "test");
  for (const id of completedIds) {
    progress.lessonStatus[id] = "completed";
  }
  return progress;
}

describe("seleção content-owned (spec AID-915 §3.3)", () => {
  it("toda atividade referenciada existe no read model gerado", () => {
    for (const checkpoint of CHECKPOINT_SELECTION) {
      expect(checkpoint.activityRefs.length).toBeGreaterThan(0);
      for (const ref of checkpoint.activityRefs) {
        const lesson = lessons.find((entry) => entry.id === ref.lessonId);
        expect(lesson, `${ref.lessonId} deve existir`).toBeDefined();
        expect(
          lesson?.activities.some((activity) => activity.id === ref.activityId),
          `${ref.lessonId}/${ref.activityId} deve existir`,
        ).toBe(true);
      }
    }
  });

  it("1 atividade por lição, lições todas do próprio módulo, ordem do catálogo", () => {
    for (const checkpoint of CHECKPOINT_SELECTION) {
      const lessonIds = checkpoint.activityRefs.map((ref) => ref.lessonId);
      expect(new Set(lessonIds).size).toBe(lessonIds.length);
      for (const ref of checkpoint.activityRefs) {
        const lesson = lessons.find((entry) => entry.id === ref.lessonId);
        expect(lesson?.moduleId).toBe(checkpoint.moduleId);
      }
    }
  });

  it("mapa de ativação aponta para checkpoints existentes (consistência)", () => {
    const ids = new Set(CHECKPOINT_SELECTION.map((checkpoint) => checkpoint.id));
    for (const checkpointId of Object.values(CHECKPOINT_ACTIVATION)) {
      expect(ids.has(checkpointId)).toBe(true);
    }
  });
});

describe("disponibilidade (última lição do módulo, §3.4)", () => {
  it("cp-01 só fica disponível com l03 concluída", () => {
    const partial = progressWithCompleted(["l01", "l02"]);
    expect(isCheckpointAvailable(partial, publicModules, "cp-01")).toBe(false);
    const done = progressWithCompleted(["l01", "l02", "l03"]);
    expect(isCheckpointAvailable(done, publicModules, "cp-01")).toBe(true);
  });

  it("rota intermediate (l01 pulada) também abre cp-01 — risco R1 mitigado", () => {
    const intermediate = progressWithCompleted(["l02", "l03"]);
    expect(isCheckpointAvailable(intermediate, publicModules, "cp-01")).toBe(true);
  });

  it("lastReadyLessonOfModule/firstReadyLessonOfModule retornam as âncoras certas", () => {
    expect(lastReadyLessonOfModule(publicModules, "mod-01")?.id).toBe("l03");
    expect(lastReadyLessonOfModule(publicModules, "mod-02")?.id).toBe("l07");
    expect(lastReadyLessonOfModule(publicModules, "mod-03")?.id).toBe("l11");
    expect(firstReadyLessonOfModule(publicModules, "mod-02")?.id).toBe("l04");
  });
});

describe("gate locked-only (grandfathering, §3.4)", () => {
  it("concluir l03 NÃO desbloqueia l04 enquanto cp-01 pendente", () => {
    const progress = progressWithCompleted(["l01", "l02", "l03"]);
    progress.lessonStatus.l03 = "completed";
    const result = unlockNextReadyLesson(progress, publicModules, "l03");
    expect(result.unlockedLessonId).toBeUndefined();
    expect(result.progress.lessonStatus.l04).toBe("locked");
  });

  it("concluir l07 NÃO desbloqueia l08 sem cp-02; l12 idem sem cp-03", () => {
    const progress = progressWithCompleted(["l01", "l02", "l03", "l04", "l05", "l06", "l07"]);
    const result = unlockNextReadyLesson(progress, publicModules, "l07");
    expect(result.unlockedLessonId).toBeUndefined();
    expect(result.progress.lessonStatus.l08).toBe("locked");

    const deep = progressWithCompleted([
      "l01",
      "l02",
      "l03",
      "l04",
      "l05",
      "l06",
      "l07",
      "l08",
      "l09",
      "l10",
      "l11",
    ]);
    const gated = unlockNextReadyLesson(deep, modules, "l11");
    expect(gated.unlockedLessonId).toBeUndefined();
    expect(gated.progress.lessonStatus.l12).toBe("locked");
  });

  it("grandfathering: lição já available/in_progress/completed nunca é re-bloqueada", () => {
    const progress = progressWithCompleted(["l01", "l02", "l03"]);
    progress.lessonStatus.l04 = "available";
    expect(isLessonGateLocked(progress, publicModules, "l04")).toBe(true);
    // O gate só age no caminho locked→available: l04 available continua available.
    const result = unlockNextReadyLesson(progress, publicModules, "l03");
    expect(result.progress.lessonStatus.l04).toBe("available");
    expect(result.progress.lessonStatus.l05).toBe("locked");
  });

  it("dentro do módulo o desbloqueio segue linear (l03→l04 é fronteira, l04→l05 não)", () => {
    const progress = progressWithCompleted(["l01", "l02", "l03"]);
    progress.moduleCheckpoints["mod-01"] = {
      status: "completed",
      bestScore: 1,
      attempts: 1,
      completedAt: NOW.toISOString(),
    };
    progress.lessonStatus.l04 = "available";
    const result = unlockNextReadyLesson(progress, publicModules, "l04");
    expect(result.unlockedLessonId).toBe("l05");
  });

  it("módulos fora do corredor seguem linear como hoje (mod-05→mod-06)", () => {
    const progress = progressWithCompleted([
      "l01",
      "l02",
      "l03",
      "l04",
      "l05",
      "l06",
      "l07",
      "l08",
      "l09",
      "l10",
      "l11",
      "l12",
      "l13",
      "l14",
    ]);
    for (const [moduleId, checkpointId] of Object.entries(CHECKPOINT_ACTIVATION)) {
      const checkpoint = CHECKPOINT_SELECTION.find((entry) => entry.id === checkpointId);
      progress.moduleCheckpoints[checkpoint?.moduleId ?? moduleId] = {
        status: "completed",
        bestScore: 1,
        attempts: 1,
        completedAt: NOW.toISOString(),
      };
    }
    const result = unlockNextReadyLesson(progress, publicModules, "l14");
    expect(result.unlockedLessonId).toBe("l18");
  });
});

describe("sessão de desafio (§3.3)", () => {
  it("start exige disponibilidade e recusa conclusão repetida; conta tentativas", () => {
    const base = progressWithCompleted(["l01", "l02", "l03"]);
    expect(() => startCheckpointSession(base, publicModules, "cp-02")).toThrow();

    const started = startCheckpointSession(base, publicModules, "cp-01");
    expect(started.moduleCheckpoints["mod-01"]).toEqual({
      status: "available",
      bestScore: 0,
      attempts: 1,
    });
    const restarted = startCheckpointSession(started, publicModules, "cp-01");
    expect(restarted.moduleCheckpoints["mod-01"]?.attempts).toBe(2);

    const completed = completeCheckpointSession(started, publicModules, "cp-01", [1, 1, 1], NOW);
    expect(() => startCheckpointSession(completed.progress, modules, "cp-01")).toThrow();
  });

  it("aprovação: média ≥ 0.75 marca completed e desbloqueia a primeira lição do módulo seguinte", () => {
    const base = progressWithCompleted(["l01", "l02", "l03"]);
    const started = startCheckpointSession(base, publicModules, "cp-01");
    const result = completeCheckpointSession(started, publicModules, "cp-01", [1, 1, 0.6], NOW);
    // média = 0.866… ≥ 0.75
    expect(result.outcome.passed).toBe(true);
    expect(result.progress.moduleCheckpoints["mod-01"]?.status).toBe("completed");
    expect(result.progress.moduleCheckpoints["mod-01"]?.completedAt).toBe(NOW.toISOString());
    expect(result.unlockedLessonId).toBe("l04");
    expect(result.progress.lessonStatus.l04).toBe("available");
    expect(result.progress.currentLessonId).toBe("l04");
    // gate aberto: l04 destravada no caminho linear
    expect(isLessonGateLocked(result.progress, modules, "l04")).toBe(false);
  });

  it("cp-03 concluído desbloqueia mod-04 (l12); corredor completo não destrava nada além", () => {
    const base = progressWithCompleted([
      "l01",
      "l02",
      "l03",
      "l04",
      "l05",
      "l06",
      "l07",
      "l08",
      "l09",
      "l10",
      "l11",
    ]);
    const started = startCheckpointSession(base, publicModules, "cp-03");
    const result = completeCheckpointSession(started, publicModules, "cp-03", [1, 1, 1, 1], NOW);
    expect(result.outcome.passed).toBe(true);
    expect(result.unlockedLessonId).toBe("l12");
  });

  it("falha: nada muda de status, bestScore guarda a melhor, retry é livre (§3.4)", () => {
    const base = progressWithCompleted(["l01", "l02", "l03"]);
    const started = startCheckpointSession(base, publicModules, "cp-01");
    const failed = completeCheckpointSession(started, publicModules, "cp-01", [1, 0, 0], NOW);
    expect(failed.outcome.passed).toBe(false);
    expect(failed.progress.lessonStatus.l04).toBe("locked");
    expect(failed.progress.moduleCheckpoints["mod-01"]?.status).toBe("available");
    expect(failed.progress.moduleCheckpoints["mod-01"]?.bestScore).toBeCloseTo(1 / 3, 5);
    const recovered = completeCheckpointSession(
      failed.progress,
      publicModules,
      "cp-01",
      [1, 1, 1],
      NOW,
    );
    expect(recovered.outcome.passed).toBe(true);
    expect(recovered.progress.moduleCheckpoints["mod-01"]?.bestScore).toBe(1);
  });

  it("limiar do desafio segue CHECKPOINT_MINIMUM_SCORE (0.75)", () => {
    expect(CHECKPOINT_MINIMUM_SCORE).toBe(0.75);
    expect(evaluateCheckpointOutcome([0.75, 0.75]).passed).toBe(true);
    expect(evaluateCheckpointOutcome([1, 0.4]).passed).toBe(false);
    expect(evaluateCheckpointOutcome([]).passed).toBe(false);
  });

  it("estado inicial do corredor: sem checkpoints, schema 4, nada 'mastered'", () => {
    const progress = createInitialProgress(modules, "test");
    expect(progress.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
    expect(progress.moduleCheckpoints).toEqual({});
    expect(isCheckpointCompleted(progress, "cp-01")).toBe(false);
    expect(JSON.stringify(progress)).not.toContain("mastered");
  });
});
