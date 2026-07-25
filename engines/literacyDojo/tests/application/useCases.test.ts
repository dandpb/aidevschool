import { beforeEach, describe, expect, it } from "vitest";
import { LessonLockedError } from "../../src/application/useCases";
import type { OutputComparisonActivity } from "../../src/data/generated/lessons";
import { lessons, modules } from "../../src/data/generated/lessons";
import { isValidEvidenceRecord } from "../../src/domain/evidence";
import {
  MAP_INITIAL_LESSON_ID,
  XP_PER_ACTIVITY_PASS,
  XP_PER_LESSON_COMPLETE,
  createInitialProgress,
} from "../../src/domain/progress";
import { FIXED_NOW, makeServices } from "../helpers";

const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
if (!lesson) throw new Error("Mapa Inicial ausente do read model");
const guidedLesson = lessons.find((item) => item.id === "l01");
const intermediateLesson = lessons.find((item) => item.id === "l03");
if (!guidedLesson || !intermediateLesson) throw new Error("rota adaptativa incompleta");
const activity = lesson.activities[0] as OutputComparisonActivity;
const activityId = activity.id;

const RIGHT_ANSWER = {
  outputId: activity.evaluation.betterOutputId,
  criterionIds: [...activity.evaluation.requiredCriterionIds],
};
const WRONG_ANSWER = {
  outputId: activity.data.outputs.find((output) => output.id !== activity.evaluation.betterOutputId)
    ?.id,
  criterionIds: [],
};

async function completeMvpOnboarding(services: ReturnType<typeof makeServices>["services"]) {
  await services.useCases.completeOnboarding({
    goal: "save_time",
    context: "work",
    confidence: "medium",
    taskCategory: "scheduling",
  });
}

describe("startLesson", () => {
  it("lição disponível vira in_progress e emite lesson_started", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    const progress = await services.useCases.startLesson(lesson.id);
    expect(progress.lessonStatus[lesson.id]).toBe("in_progress");
    expect(progress.currentLessonId).toBe(lesson.id);
    expect(services.analytics.events.map((event) => event.event)).toContain("lesson_started");
  });

  it("lição bloqueada lança LessonLockedError", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    await expect(services.useCases.startLesson(guidedLesson.id)).rejects.toThrow(LessonLockedError);
  });
});

describe("submitActivityAttempt", () => {
  let services: ReturnType<typeof makeServices>["services"];

  beforeEach(() => {
    services = makeServices().services;
  });

  it("tentativa errada: evidência válida emitida, sem XP, skill registrada, streak iniciada", async () => {
    const result = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId,
      answer: WRONG_ANSWER,
    });
    expect(result.evaluation.pass).toBe(false);

    // Envelope de evidência conforme evidence-contract.
    expect(services.evidence.records).toHaveLength(1);
    const record = services.evidence.records[0];
    expect(isValidEvidenceRecord(record)).toBe(true);
    expect(record.lessonId).toBe(lesson.id);
    expect(record.lessonVersion).toBe(lesson.version);
    expect(record.activityId).toBe(activityId);
    expect(record.activityType).toBe(activity.type);
    expect(record.skillIds).toEqual(lesson.skillIds);
    expect(record.verifierRequired).toBe(true);
    expect(record.attemptId).toBe("att-000001");
    // Sem texto livre: deterministicChecks só com primitivos estruturados.
    for (const value of Object.values(record.deterministicChecks)) {
      expect(["boolean", "number", "string"]).toContain(typeof value);
    }

    expect(result.progress.xp).toBe(0);
    expect(result.progress.counters.attempts).toBe(1);
    expect(result.progress.streak.current).toBe(1);
    expect(result.progress.streak.lastActivityDate).toBe("2026-07-19");
    const skill = result.progress.skills[lesson.skillIds[0]];
    expect(skill.attempts).toBe(1);
    expect(skill.passes).toBe(0);

    const persisted = await services.progressRepo.load();
    expect(persisted?.counters.attempts).toBe(1);
    expect(services.analytics.events.map((event) => event.event)).toContain("activity_attempted");
  });

  it("tentativa certa: XP, pass, revisão agendada e evento activity_passed", async () => {
    await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId,
      answer: WRONG_ANSWER,
    });
    const result = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId,
      answer: RIGHT_ANSWER,
    });
    expect(result.evaluation.pass).toBe(true);
    expect(result.progress.xp).toBe(XP_PER_ACTIVITY_PASS);
    const skill = result.progress.skills[lesson.skillIds[0]];
    expect(skill.attempts).toBe(2);
    expect(skill.passes).toBe(1);
    expect(skill.nextReviewAt).toBe(
      new Date(FIXED_NOW.getTime() + lesson.review.intervalsDays[0] * 86_400_000).toISOString(),
    );
    const events = services.analytics.events.map((event) => event.event);
    expect(events).toContain("activity_passed");
    expect(services.evidence.records).toHaveLength(2);
    expect(services.evidence.records[1].pass).toBe(true);
    expect(services.evidence.records[1].attemptId).toBe("att-000002");
  });

  it("feedback determinístico vem do conteúdo (onFailure + perCheck)", async () => {
    const result = await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId,
      answer: WRONG_ANSWER,
    });
    expect(result.feedback.summary).toBe(activity.feedback.onFailure);
    const betterCheck = result.feedback.perCheck.find(
      (check) => check.checkId === "betterOutputId",
    );
    expect(betterCheck?.passed).toBe(false);
    expect(betterCheck?.message).toBe(activity.feedback.perCheck?.betterOutputId);
  });
});

describe("requestHint", () => {
  it("devolve dicas pré-escritas em ordem e depois null", async () => {
    const { services } = makeServices();
    const total = services.feedback.hintCount(activity);
    expect(total).toBeGreaterThan(0);
    for (let index = 0; index < total; index += 1) {
      const result = await services.useCases.requestHint({
        lessonId: lesson.id,
        activityId,
        hintIndex: index,
      });
      expect(result.hint).toBe(activity.hints?.[index]);
      expect(result.nextIndex).toBe(index + 1);
    }
    const exhausted = await services.useCases.requestHint({
      lessonId: lesson.id,
      activityId,
      hintIndex: total,
    });
    expect(exhausted.hint).toBeNull();
    expect(
      services.analytics.events.filter((event) => event.event === "hint_requested"),
    ).toHaveLength(total + 1);
  });
});

describe("retryActivity", () => {
  it("registra a intenção de tentar novamente", async () => {
    const { services } = makeServices();
    await services.useCases.retryActivity({ lessonId: lesson.id, activityId });
    expect(services.analytics.events.map((event) => event.event)).toContain("activity_retried");
  });
});

describe("completeLesson", () => {
  it("acerto de primeira no Mapa Inicial libera a rota intermediária", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(lesson.id);
    await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId,
      answer: RIGHT_ANSWER,
    });
    const result = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: { [activityId]: 1 },
      durationSeconds: 180,
    });
    expect(result.outcome.completed).toBe(true);
    expect(result.nextLessonId).toBe(intermediateLesson.id);
    expect(result.progress.lessonStatus[lesson.id]).toBe("completed");
    expect(result.progress.lessonStatus[intermediateLesson.id]).toBe("available");
    expect(result.progress.currentLessonId).toBe(intermediateLesson.id);
    expect(result.progress.onboarding.route).toBe("intermediate");
    expect(result.progress.xp).toBe(XP_PER_ACTIVITY_PASS + XP_PER_LESSON_COMPLETE);
    const skill = result.progress.skills[lesson.skillIds[0]];
    expect(skill.nextReviewAt).toBe(
      new Date(FIXED_NOW.getTime() + lesson.review.intervalsDays[0] * 86_400_000).toISOString(),
    );
    expect(services.analytics.events.map((event) => event.event)).toContain("lesson_completed");
    // Nunca mastered:
    expect(JSON.stringify(result.progress)).not.toContain("mastered");
  });

  it("dica ou nova tentativa no Mapa Inicial libera a rota guiada", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(lesson.id);
    await services.useCases.requestHint({ lessonId: lesson.id, activityId, hintIndex: 0 });
    await services.useCases.retryActivity({ lessonId: lesson.id, activityId });
    const result = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: { [activityId]: 1 },
    });
    expect(result.outcome.completed).toBe(true);
    expect(result.nextLessonId).toBe(guidedLesson.id);
    expect(result.progress.onboarding.route).toBe("guided");
    expect(result.progress.lessonStatus[guidedLesson.id]).toBe("available");
  });

  it("erro na primeira tentativa também libera a rota guiada", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(lesson.id);
    await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId,
      answer: WRONG_ANSWER,
    });
    await services.useCases.submitActivityAttempt({
      lessonId: lesson.id,
      activityId,
      answer: RIGHT_ANSWER,
    });
    const result = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: { [activityId]: 1 },
    });
    expect(result.progress.onboarding.route).toBe("guided");
    expect(result.nextLessonId).toBe(guidedLesson.id);
  });
});

describe("scheduleReview", () => {
  it("agenda revisão com clamp no último intervalo", async () => {
    const { services } = makeServices();
    const progress = await services.useCases.scheduleReview({
      lessonId: lesson.id,
      intervalIndex: 99,
    });
    const last = lesson.review.intervalsDays[lesson.review.intervalsDays.length - 1];
    expect(progress.skills[lesson.skillIds[0]].nextReviewAt).toBe(
      new Date(FIXED_NOW.getTime() + last * 86_400_000).toISOString(),
    );
  });
});

describe("resumeSession", () => {
  it("sem progresso ou sem onboarding → onboarding", async () => {
    const { services, progressRepo } = makeServices();
    expect(await services.useCases.resumeSession()).toEqual({ kind: "onboarding" });
    await progressRepo.reset();
    expect(await services.useCases.resumeSession()).toEqual({ kind: "onboarding" });
  });

  it("onboarding feito e lição em andamento → retoma o player", async () => {
    const progress = createInitialProgress(modules, "x");
    progress.onboarding = { completed: true };
    progress.lessonStatus[lesson.id] = "in_progress";
    progress.currentLessonId = lesson.id;
    const { services } = makeServices({ progress });
    expect(await services.useCases.resumeSession()).toEqual({
      kind: "lesson",
      lessonId: lesson.id,
    });
  });

  it("onboarding feito sem lição em andamento → home", async () => {
    const progress = createInitialProgress(modules, "x");
    progress.onboarding = { completed: true };
    const { services } = makeServices({ progress });
    expect(await services.useCases.resumeSession()).toEqual({ kind: "home" });
  });
});

describe("resetProgress", () => {
  it("apaga o estado persistido", async () => {
    const { services, progressRepo } = makeServices();
    await services.useCases.resetProgress();
    expect(await progressRepo.load()).toBeNull();
  });
});

describe("completeOnboarding", () => {
  it("marca onboarding concluído e emite evento com categoria (sem texto livre)", async () => {
    const { services } = makeServices();
    const progress = await services.useCases.completeOnboarding({
      goal: "verify_answers",
      context: "work",
      confidence: "medium",
      taskCategory: "scheduling",
    });
    expect(progress.onboarding.completed).toBe(true);
    expect(progress.onboarding.context).toBe("work");
    expect(progress.onboarding.taskCategory).toBe("scheduling");
    expect(services.analytics.events).toContainEqual({
      event: "onboarding_completed",
      payload: { context: "work" },
    });
  });
});
