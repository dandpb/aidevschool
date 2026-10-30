import { expect, it } from "vitest";
import { modules } from "../../src/data/generated/lessons";
import { completeCheckpointSession } from "../../src/domain/checkpoints";
import { createInitialProgress } from "../../src/domain/progress";

const publicModules = modules.filter((item) => item.journey === "ia_pratica");
function completed() {
  const progress = createInitialProgress(publicModules, "v1");
  progress.moduleCheckpoints["mod-01"] = {
    status: "completed",
    bestScore: 1,
    attempts: 2,
    completedAt: "2026-10-30T12:00:00.000Z",
  };
  progress.lessonStatus.l04 = "available";
  progress.currentLessonId = "l04";
  return progress;
}

it("repete confirmação sem regravar conclusão ou perder destino atual", () => {
  const progress = completed();
  const result = completeCheckpointSession(
    progress,
    publicModules,
    "cp-01",
    [1, 1, 1],
    new Date("2026-11-01T12:00:00Z"),
  );
  expect(result.progress).toBe(progress);
  expect(result.unlockedLessonId).toBe("l04");
  expect(progress.moduleCheckpoints["mod-01"].completedAt).toBe("2026-10-30T12:00:00.000Z");
});

it("não sugere lição antiga nem rebaixa conclusão existente", () => {
  for (const kind of ["cursor", "locked", "completed", "dev"] as const) {
    const progress = completed();
    if (kind === "cursor") progress.currentLessonId = "l05";
    if (kind === "locked") progress.lessonStatus.l04 = "locked";
    if (kind === "completed") progress.lessonStatus.l04 = "completed";
    if (kind === "dev") progress.journeys = { active: "dev" };
    const result = completeCheckpointSession(
      progress,
      publicModules,
      "cp-01",
      [1, 1, 1],
      new Date(),
    );
    expect(result.progress).toBe(progress);
    expect(result.unlockedLessonId).toBeUndefined();
  }
  const progress = completed();
  const failed = completeCheckpointSession(progress, publicModules, "cp-01", [0, 0, 0], new Date());
  expect(failed.progress).toBe(progress);
  expect(failed.progress.moduleCheckpoints["mod-01"].status).toBe("completed");
});

it("preserva ausência de data e só oferece o cursor em andamento nos três gates", () => {
  for (const [checkpointId, moduleId, target] of [
    ["cp-01", "mod-01", "l04"],
    ["cp-02", "mod-02", "l08"],
    ["cp-03", "mod-03", "l12"],
  ] as const) {
    const progress = createInitialProgress(publicModules, "v1");
    progress.moduleCheckpoints[moduleId] = { status: "completed", bestScore: 0.9, attempts: 3 };
    progress.lessonStatus[target] = "in_progress";
    progress.currentLessonId = target;
    const result = completeCheckpointSession(
      progress,
      publicModules,
      checkpointId,
      [1, 1, 1],
      new Date(),
    );
    expect(result.progress).toBe(progress);
    expect(result.unlockedLessonId).toBe(target);
    expect(result.progress.moduleCheckpoints[moduleId].completedAt).toBeUndefined();
  }
});
