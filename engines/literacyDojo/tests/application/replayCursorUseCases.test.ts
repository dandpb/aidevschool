import { describe, expect, it } from "vitest";
import { createServices } from "../../src/app/services";
import { lessons } from "../../src/data/generated/lessons";
import { InMemoryEvidenceSink, InMemoryProgressRepository, fixedClock } from "../fakes";
import { makeServices } from "../helpers";

describe("replay em diferentes stores e jornadas", () => {
  for (const legacy of [false, true]) {
    for (const scenario of [
      { active: "dev", cursor: "l16", lessonId: "l02", next: "l03" },
      { active: "ia_pratica", cursor: "l04", lessonId: "l15", next: "l16" },
    ] as const) {
      it(`preserva cursores: store legado=${legacy}, jornada=${scenario.active}`, async () => {
        const bundle = makeServices();
        const progress = bundle.initial;
        progress.onboarding = { completed: true, route: "intermediate" };
        progress.lessonStatus.l02 = "completed";
        progress.lessonStatus.l03 = "completed";
        progress.lessonStatus.l04 = "in_progress";
        progress.lessonStatus.l15 = "completed";
        progress.lessonStatus.l16 = "in_progress";
        progress.currentLessonId = scenario.cursor;
        progress.journeys = { active: scenario.active, current: { ia_pratica: "l04", dev: "l16" } };
        bundle.stateStore.seedProgress(progress);
        const repo = new InMemoryProgressRepository();
        repo.seed(progress);
        const services = legacy
          ? createServices({
              stateStore: bundle.stateStore,
              progressRepo: repo,
              evidence: new InMemoryEvidenceSink(),
              clock: fixedClock(new Date("2026-07-19T12:00:00Z")),
            })
          : bundle.services;
        const lesson = lessons.find((item) => item.id === scenario.lessonId);
        if (!lesson) throw new Error("lição ausente");
        const scores = Object.fromEntries(
          lesson.completion.requiredActivityIds.map((id) => [id, 1]),
        );
        const opened = await services.useCases.startLesson(scenario.lessonId);
        expect(opened.currentLessonId).toBe(scenario.cursor);
        expect(opened.journeys?.current).toEqual({ ia_pratica: "l04", dev: "l16" });
        const result = await services.useCases.completeLesson({
          lessonId: scenario.lessonId,
          bestScores: scores,
        });
        expect(result.progress.currentLessonId).toBe(scenario.cursor);
        expect(result.progress.journeys?.current).toEqual({ ia_pratica: "l04", dev: "l16" });
        expect(result.nextLessonId).toBe(scenario.next);
        expect(result.firstCompletion).toBe(false);
        const stored = legacy ? await repo.load() : await bundle.stateStore.loadProgress();
        expect(stored?.currentLessonId).toBe(scenario.cursor);
        expect(stored?.journeys?.current).toEqual({ ia_pratica: "l04", dev: "l16" });
      });
    }
  }
});
