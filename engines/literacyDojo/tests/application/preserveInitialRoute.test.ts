import { expect, it } from "vitest";
import { lessons } from "../../src/data/generated/lessons";
import { makeServices } from "../helpers";

it("revisão de l02 conserva marcadores iniciais e registra prática e evidência", async () => {
  const activity = lessons.find((lesson) => lesson.id === "l02")?.activities[0];
  if (!activity || activity.type !== "output_comparison") throw new Error("atividade ausente");
  const { services, stateStore, initial } = makeServices();
  initial.onboarding = {
    completed: true,
    route: "intermediate",
    mapInitial: { attempts: 1, firstAttemptPassed: true, hintRequested: false, retried: false },
  };
  initial.lessonStatus.l02 = "completed";
  stateStore.seedProgress(initial);
  const markers = structuredClone(initial.onboarding.mapInitial);
  await services.useCases.requestHint({ lessonId: "l02", activityId: activity.id, hintIndex: 0 });
  await services.useCases.retryActivity({ lessonId: "l02", activityId: activity.id });
  const result = await services.useCases.submitActivityAttempt({
    lessonId: "l02",
    activityId: activity.id,
    context: "review",
    answer: {
      outputId: activity.evaluation.betterOutputId,
      criterionIds: [...activity.evaluation.requiredCriterionIds],
    },
  });
  expect(result.progress.onboarding.mapInitial).toEqual(markers);
  expect(result.progress.counters.attempts).toBe(initial.counters.attempts + 1);
  expect(result.progress.skills.entender?.attempts).toBeGreaterThan(0);
  expect(result.progress.xp).toBeGreaterThan(initial.xp);
  expect(services.evidence.records).toHaveLength(1);
  expect(services.evidence.records[0].context).toBe("review");
});
