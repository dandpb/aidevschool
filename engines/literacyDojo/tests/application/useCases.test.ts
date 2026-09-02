import { beforeEach, describe, expect, it } from "vitest";
import * as generatedContentAdapter from "../../src/adapters/generatedContentRepository";
import { createServices } from "../../src/app/services";
import type { OutputComparisonActivity } from "../../src/data/generated/lessons";
import { lessons, modules } from "../../src/data/generated/lessons";
import { isValidEvidenceRecord } from "../../src/domain/evidence";
import {
  MAP_INITIAL_LESSON_ID,
  XP_PER_ACTIVITY_PASS,
  XP_PER_LESSON_COMPLETE,
  createInitialProgress,
} from "../../src/domain/progress";
import { InMemoryEvidenceSink, InMemoryProgressRepository, fixedClock } from "../fakes";
import { FIXED_NOW, makeServices } from "../helpers";

const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
if (!lesson) throw new Error("Mapa Inicial ausente do read model");
const guidedLesson = lessons.find((item) => item.id === "l01");
const intermediateLesson = lessons.find((item) => item.id === "l03");
const promptLesson = lessons.find((item) => item.id === "l05");
if (!guidedLesson || !intermediateLesson || !promptLesson) {
  throw new Error("rota adaptativa incompleta");
}
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
    audience: "ia_pratica",
  });
}

describe("startLesson", () => {
  it("lição disponível vira in_progress", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    const progress = await services.useCases.startLesson(lesson.id);
    expect(progress.lessonStatus[lesson.id]).toBe("in_progress");
    expect(progress.currentLessonId).toBe(lesson.id);
  });

  it("lição bloqueada lança LessonLockedError", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    await expect(services.useCases.startLesson(guidedLesson.id)).rejects.toThrow(/bloqueada/);
  });

  it.each([
    "l01",
    "l02",
    "l03",
    "l04",
    "l08",
    "l14",
    "l15",
    "l16",
    "l17",
    "l18",
    "l19",
    "l20",
    "l24",
    "l25",
    "l26",
    "l27",
    "l28",
  ])("prepara a missão hospedada declarada %s", async (lessonId) => {
    const { services } = makeServices();
    const progress = await services.useCases.prepareHostedMission(lessonId);

    expect(progress.onboarding.completed).toBe(true);
    expect(progress.lessonStatus[lessonId]).toBe("in_progress");
    expect(progress.currentLessonId).toBe(lessonId);
    expect(JSON.stringify(progress)).not.toContain("mastered");
  });

  it("registra audiência trilha_dev no onboarding hospedado de lição dev", async () => {
    const { services } = makeServices();
    const progress = await services.useCases.prepareHostedMission("l15");

    expect(progress.onboarding.completed).toBe(true);
    expect(progress.onboarding.audience).toBe("trilha_dev");
  });

  it("rejeita lição fora do conjunto hospedado publicado", async () => {
    const hosted = lessons.find((item) => item.id === "l16");
    if (!hosted) throw new Error("l16 ausente do read model");
    const unpublished = { ...hosted, id: "l99" };
    const progressRepo = new InMemoryProgressRepository();
    progressRepo.seed(createInitialProgress(generatedContentAdapter.listModules(), "test"));
    const services = createServices({
      content: {
        ...generatedContentAdapter,
        getLesson: (lessonId: string) =>
          lessonId === "l99" ? unpublished : generatedContentAdapter.getLesson(lessonId),
      },
      progressRepo,
      evidence: new InMemoryEvidenceSink(),
      clock: fixedClock(FIXED_NOW),
    });
    await expect(services.useCases.prepareHostedMission("l99")).rejects.toThrow(/não autorizada/);
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
    expect(record.answer).toEqual(WRONG_ANSWER);
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
    expect(services.evidence.records).toHaveLength(2);
    expect(services.evidence.records[1].pass).toBe(true);
    expect(services.evidence.records[1].attemptId).toBe("att-000002");
    expect(services.evidence.records[1].answer).toEqual(RIGHT_ANSWER);
  });

  it("prompt builder não persiste resposta de texto livre", async () => {
    const promptActivity = promptLesson.activities[0];
    const answer = {
      values: {
        objetivo: "avisar clientes sobre a mudança",
        contexto: "a clínica mudará o horário no próximo mês",
        publico: "clientes da clínica",
        formato: "e-mail curto",
      },
    };
    const result = await services.useCases.submitActivityAttempt({
      lessonId: promptLesson.id,
      activityId: promptActivity.id,
      answer,
    });
    expect(result.record.answer).toBeUndefined();
    expect(JSON.stringify(result.record)).not.toContain(answer.values.contexto);
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

describe("completeOnboarding", () => {
  it("marca onboarding concluído com categoria (sem texto livre)", async () => {
    const { services } = makeServices();
    const progress = await services.useCases.completeOnboarding({
      goal: "verify_answers",
      context: "work",
      confidence: "medium",
      taskCategory: "scheduling",
      audience: "ia_pratica",
    });
    expect(progress.onboarding.completed).toBe(true);
    expect(progress.onboarding.context).toBe("work");
    expect(progress.onboarding.taskCategory).toBe("scheduling");
  });
});

describe("export/import progress", () => {
  it("exporta JSON e reimporta persistindo via migrateProgress", async () => {
    const { services, progressRepo } = makeServices();
    await completeMvpOnboarding(services);
    const exported = await services.useCases.exportProgress();
    expect(exported).not.toContain("mastered");

    const imported = await services.useCases.importProgress(exported);
    expect(imported.onboarding.completed).toBe(true);
    expect(JSON.stringify(imported)).not.toContain("mastered");
    expect(await progressRepo.load()).toEqual(imported);
  });

  it("rejeita backup inválido e preserva o progresso atual", async () => {
    const { services, progressRepo } = makeServices();
    const before = await progressRepo.load();
    await expect(services.useCases.importProgress("{")).rejects.toThrow(
      /não migrável|JSON inválido/,
    );
    expect(await progressRepo.load()).toEqual(before);
  });
});
