import { expect, it, vi } from "vitest";
import { createServices } from "../../src/app/services";
import { InMemoryProgressRepository, fixedClock } from "../fakes";
import { makeServices } from "../helpers";

it("não grava de novo uma conclusão já confirmada", async () => {
  const { services, stateStore, initial } = makeServices();
  initial.moduleCheckpoints["mod-01"] = {
    status: "completed",
    bestScore: 1,
    attempts: 2,
    completedAt: "2026-10-30T12:00:00.000Z",
  };
  initial.lessonStatus.l04 = "available";
  initial.currentLessonId = "l04";
  stateStore.seedProgress(initial);
  const save = vi.spyOn(stateStore, "saveState");
  const result = await services.useCases.completeCheckpoint({
    checkpointId: "cp-01",
    bestScores: { "l01:l01-a2": 1, "l02:l02-a1": 1, "l03:l03-a2": 1 },
  });
  expect(result.unlockedLessonId).toBe("l04");
  expect(save).not.toHaveBeenCalled();
  expect((await stateStore.loadProgress())?.moduleCheckpoints["mod-01"].completedAt).toBe(
    "2026-10-30T12:00:00.000Z",
  );
});

it("também evita regravação no repositório legado", async () => {
  const { initial, stateStore } = makeServices();
  initial.moduleCheckpoints["mod-01"] = { status: "completed", bestScore: 1, attempts: 2 };
  initial.lessonStatus.l04 = "available";
  initial.currentLessonId = "l04";
  const legacy = new InMemoryProgressRepository();
  legacy.seed(initial);
  const services = createServices({
    stateStore,
    progressRepo: legacy,
    clock: fixedClock(new Date("2026-10-30T12:00:00Z")),
  });
  const save = vi.spyOn(legacy, "save");
  const result = await services.useCases.completeCheckpoint({
    checkpointId: "cp-01",
    bestScores: { "l01:l01-a2": 1, "l02:l02-a1": 1, "l03:l03-a2": 1 },
  });
  expect(result.unlockedLessonId).toBe("l04");
  expect(save).not.toHaveBeenCalled();
  expect((await legacy.load())?.moduleCheckpoints["mod-01"].completedAt).toBeUndefined();
});
