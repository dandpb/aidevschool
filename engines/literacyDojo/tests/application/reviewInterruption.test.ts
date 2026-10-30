import { describe, expect, it } from "vitest";
import { createServices } from "../../src/app/services";
import { lessons } from "../../src/data/generated/lessons";
import type { OutputComparisonActivity } from "../../src/data/generated/lessons";
import {
  MAP_INITIAL_LESSON_ID,
  XP_PER_ACTIVITY_PASS,
  applyAttemptToSkills,
} from "../../src/domain/progress";
import {
  InMemoryEvidenceSink,
  InMemoryLearnerStateStore,
  InMemoryProgressRepository,
  fixedClock,
} from "../fakes";
import { FIXED_NOW, makeServices } from "../helpers";

const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
if (!lesson) throw new Error("Mapa Inicial ausente");
const activity = lesson.activities[0] as OutputComparisonActivity;
const answer = {
  outputId: activity.evaluation.betterOutputId,
  criterionIds: [...activity.evaluation.requiredCriterionIds],
};
const due = "2020-01-01T00:00:00.000Z";

describe("agenda durante revisão incompleta", () => {
  it.each(["state", "legacy"] as const)(
    "preserva data e estágio em %s e registra a tentativa",
    async (storeKind) => {
      const { initial } = makeServices();
      for (const skillId of lesson.skillIds) {
        initial.skills[skillId] = {
          skillId,
          attempts: 3,
          passes: 2,
          lastScore: 1,
          lastPracticedAt: due,
          nextReviewAt: due,
          reviewStage: 0,
        };
      }
      const stateStore = new InMemoryLearnerStateStore();
      stateStore.seedProgress(initial);
      const legacy = new InMemoryProgressRepository();
      legacy.seed(initial);
      const evidence = new InMemoryEvidenceSink();
      const services = createServices({
        stateStore,
        ...(storeKind === "legacy" ? { progressRepo: legacy } : {}),
        evidence,
        clock: fixedClock(FIXED_NOW),
      });
      const result = await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer,
        context: "review",
        deferReviewSchedule: true,
      });
      expect(result.evaluation.pass).toBe(true);
      expect(result.progress.counters.attempts).toBe(initial.counters.attempts + 1);
      expect(result.progress.xp).toBe(initial.xp + XP_PER_ACTIVITY_PASS);
      for (const skillId of lesson.skillIds) {
        expect(result.progress.skills[skillId].nextReviewAt).toBe(due);
        expect(result.progress.skills[skillId].reviewStage).toBe(0);
        expect(result.progress.skills[skillId].passes).toBe(3);
      }
      expect(evidence.records).toHaveLength(1);
      expect(evidence.records[0].context).toBe("review");
    },
  );

  it.each(["initial", "review"] as const)(
    "mantém o agendamento anterior para %s sem política de revisão devida",
    async (context) => {
      const { services, stateStore, initial } = makeServices();
      for (const skillId of lesson.skillIds) {
        initial.skills[skillId] = {
          skillId,
          attempts: 3,
          passes: 2,
          lastScore: 1,
          lastPracticedAt: due,
          nextReviewAt: due,
          reviewStage: 0,
        };
      }
      stateStore.seedProgress(initial);
      const result = await services.useCases.submitActivityAttempt({
        lessonId: lesson.id,
        activityId: activity.id,
        answer,
        context,
      });
      for (const skillId of lesson.skillIds) {
        expect(result.progress.skills[skillId].nextReviewAt).not.toBe(due);
        expect(result.progress.skills[skillId].reviewStage).toBe(1);
      }
    },
  );

  it("estabiliza o estágio derivado legado ao interromper e retomar", async () => {
    const { services, stateStore, initial } = makeServices();
    initial.lessonStatus[lesson.id] = "completed";
    for (const skillId of lesson.skillIds) {
      initial.skills[skillId] = {
        skillId,
        attempts: 3,
        passes: 2,
        lastScore: 1,
        lastPracticedAt: due,
        nextReviewAt: due,
      };
    }
    stateStore.seedProgress(initial);
    expect((await services.useCases.startReview(lesson.id)).stage).toBe(1);
    const result = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer,
      context: "review",
      deferReviewSchedule: true,
    });
    expect(result.progress.skills[lesson.skillIds[0]].passes).toBe(3);
    expect((await services.useCases.startReview(lesson.id)).stage).toBe(1);
  });

  it("preserva diferentes estágios e contabiliza uma resposta incorreta sem reagendar", async () => {
    const { services, stateStore, initial } = makeServices();
    const [first, second] = lesson.skillIds;
    initial.lessonStatus[lesson.id] = "completed";
    initial.skills[first] = {
      skillId: first,
      attempts: 3,
      passes: 2,
      lastScore: 1,
      lastPracticedAt: due,
      nextReviewAt: due,
    };
    initial.skills[second] = {
      skillId: second,
      attempts: 4,
      passes: 3,
      lastScore: 1,
      lastPracticedAt: due,
      nextReviewAt: due,
      reviewStage: 2,
    };
    stateStore.seedProgress(initial);
    expect((await services.useCases.startReview(lesson.id)).stage).toBe(2);
    const wrong = {
      outputId: activity.data.outputs.find(
        (output) => output.id !== activity.evaluation.betterOutputId,
      )!.id,
      criterionIds: [],
    };
    const result = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer: wrong,
      context: "review",
      deferReviewSchedule: true,
    });
    expect(result.evaluation.pass).toBe(false);
    expect(result.progress.skills[first].attempts).toBe(4);
    expect(result.progress.skills[first].passes).toBe(2);
    expect(result.progress.skills[first].reviewStage).toBe(1);
    expect(result.progress.skills[second].reviewStage).toBe(2);
    expect(result.progress.skills[first].nextReviewAt).toBe(due);
    expect(result.progress.skills[second].nextReviewAt).toBe(due);
    expect((await services.useCases.startReview(lesson.id)).stage).toBe(2);
  });

  it("não fabrica estágio ou data sem intervalos definidos", () => {
    const { initial } = makeServices();
    const result = applyAttemptToSkills(initial, ["avaliar"], 1, true, FIXED_NOW, [], false);
    expect(result.skills.avaliar.reviewStage).toBeUndefined();
    expect(result.skills.avaliar.nextReviewAt).toBeUndefined();
    expect(result.skills.avaliar.passes).toBe(1);
  });

  it("conclui revisão no repositório legado sem apagar a tentativa registrada", async () => {
    const { initial } = makeServices();
    initial.lessonStatus[lesson.id] = "completed";
    for (const skillId of lesson.skillIds) {
      initial.skills[skillId] = {
        skillId,
        attempts: 3,
        passes: 2,
        lastScore: 1,
        lastPracticedAt: due,
        nextReviewAt: due,
        reviewStage: 0,
      };
    }
    const stateStore = new InMemoryLearnerStateStore();
    stateStore.seedProgress(initial);
    const legacy = new InMemoryProgressRepository();
    legacy.seed(initial);
    const services = createServices({
      stateStore,
      progressRepo: legacy,
      clock: fixedClock(FIXED_NOW),
    });
    await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId: activity.id,
      answer,
      context: "review",
      deferReviewSchedule: true,
    });
    const result = await services.useCases.completeReview({
      lessonId: lesson.id,
      bestScores: Object.fromEntries(lesson.completion.requiredActivityIds.map((id) => [id, 1])),
      intervalIndex: 1,
    });
    expect(result.outcome.completed).toBe(true);
    const saved = await legacy.load();
    expect(saved?.counters.attempts).toBe(initial.counters.attempts + 1);
    for (const skillId of lesson.skillIds) {
      expect(saved?.skills[skillId].passes).toBe(3);
      expect(saved?.skills[skillId].reviewStage).toBe(1);
      expect(saved?.skills[skillId].nextReviewAt).not.toBe(due);
    }
  });
});
