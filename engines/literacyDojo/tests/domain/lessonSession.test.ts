import { describe, expect, it } from "vitest";
import { lessons } from "../../src/data/generated/lessons";
import {
  canFinish,
  createLessonSession,
  currentActivity,
  dispatch,
  hintsFor,
  isLastActivity,
  latestAttempt,
  requiredActivitiesPassed,
  setAnswer,
} from "../../src/domain/lessonSession";

const lesson = lessons.find((item) => item.id === "l03");
if (!lesson) throw new Error("lição l03 ausente do read model");

const [activityA, activityB] = lesson.activities;
if (!activityA || !activityB) throw new Error("lição l03 precisa de pelo menos 2 atividades");

const NOW = new Date("2026-07-19T12:00:00.000Z");

function makeEvaluation(score: number, pass: boolean) {
  return {
    activityId: activityA.id,
    activityType: activityA.type,
    checks: [],
    deterministicChecks: {},
    score,
    pass,
  };
}

import type { AttemptFeedback } from "../../src/domain/feedback";

function makeFeedback(overrides?: Partial<AttemptFeedback>): AttemptFeedback {
  return {
    pass: true,
    score: 1,
    summary: "Muito bem!",
    perCheck: [],
    ...overrides,
  };
}

describe("createLessonSession", () => {
  it("inicia em intro sem tentativas", () => {
    const session = createLessonSession(lesson.id, "initial");
    expect(session.phase).toBe("intro");
    expect(session.currentActivityIndex).toBe(0);
    expect(Object.keys(session.attempts)).toHaveLength(0);
    expect(Object.keys(session.best)).toHaveLength(0);
  });
});

describe("start", () => {
  it("transiciona de intro para attempting na primeira atividade e registra startedAt", () => {
    const session = createLessonSession(lesson.id, "initial");
    const result = dispatch(session, lesson, { type: "start", now: NOW });
    expect(result.session.phase).toBe("attempting");
    expect(result.session.currentActivityIndex).toBe(0);
    expect(result.session.startedAt).toBe(NOW);
    expect(result.finishPayload).toBeUndefined();
  });
});

describe("submit", () => {
  it("registra a tentativa mais recente e a melhor nota", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = dispatch(session, lesson, { type: "start", now: NOW }).session;

    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(0.5, false),
      feedback: makeFeedback(),
    }).session;
    expect(session.phase).toBe("feedback");
    expect(latestAttempt(session, activityA.id)?.evaluation.score).toBe(0.5);
    expect(latestAttempt(session, activityA.id)).toBe(bestAttempt(session, activityA.id));

    session = dispatch(session, lesson, { type: "retry" }).session;
    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(1, true),
      feedback: makeFeedback(),
    }).session;
    expect(session.phase).toBe("feedback");
    expect(latestAttempt(session, activityA.id)?.evaluation.score).toBe(1);
    expect(bestAttempt(session, activityA.id)?.evaluation.score).toBe(1);
  });

  it("mantém a melhor nota quando uma tentativa posterior é pior", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = dispatch(session, lesson, { type: "start", now: NOW }).session;
    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(1, true),
      feedback: makeFeedback(),
    }).session;
    session = dispatch(session, lesson, { type: "retry" }).session;
    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(0.5, false),
      feedback: makeFeedback(),
    }).session;
    expect(bestAttempt(session, activityA.id)?.evaluation.score).toBe(1);
  });
});

describe("hint", () => {
  it("incrementa o índice e registra dicas mostradas", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = dispatch(session, lesson, { type: "start", now: NOW }).session;
    session = dispatch(session, lesson, { type: "hint", hint: "dica 1" }).session;
    expect(hintsFor(session, activityA.id).index).toBe(1);
    expect(hintsFor(session, activityA.id).shown).toEqual(["dica 1"]);

    session = dispatch(session, lesson, { type: "hint", hint: null }).session;
    expect(hintsFor(session, activityA.id).index).toBe(2);
    expect(hintsFor(session, activityA.id).shown).toEqual(["dica 1"]);
  });
});

describe("retry", () => {
  it("limpa a resposta e a tentativa atual, voltando para attempting", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = dispatch(session, lesson, { type: "start", now: NOW }).session;
    session = setAnswer(session, lesson, { optionIds: ["x"] });
    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(0.5, false),
      feedback: makeFeedback(),
    }).session;

    session = dispatch(session, lesson, { type: "retry" }).session;
    expect(session.phase).toBe("attempting");
    expect(latestAttempt(session, activityA.id)).toBeUndefined();
    expect(session.answers[activityA.id]).toBeUndefined();
  });
});

describe("next", () => {
  it("avança para a próxima atividade quando aprovado", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = dispatch(session, lesson, { type: "start", now: NOW }).session;
    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(1, true),
      feedback: makeFeedback(),
    }).session;
    session = dispatch(session, lesson, { type: "next" }).session;
    expect(session.phase).toBe("attempting");
    expect(session.currentActivityIndex).toBe(1);
  });

  it("não avança quando a tentativa não passou", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = dispatch(session, lesson, { type: "start", now: NOW }).session;
    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(0.5, false),
      feedback: makeFeedback(),
    }).session;
    session = dispatch(session, lesson, { type: "next" }).session;
    expect(session.currentActivityIndex).toBe(0);
  });
});

describe("finish gating", () => {
  it("só permite finish na última atividade com todas as obrigatórias aprovadas", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = dispatch(session, lesson, { type: "start", now: NOW }).session;
    expect(canFinish(session, lesson)).toBe(false);

    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: makeEvaluation(1, true),
      feedback: makeFeedback(),
    }).session;
    // Ainda não é a última atividade.
    expect(isLastActivity(session, lesson)).toBe(false);
    const beforeFinish = dispatch(session, lesson, { type: "finish", now: NOW });
    expect(beforeFinish.session.phase).not.toBe("completed");
    expect(beforeFinish.finishPayload).toBeUndefined();

    session = dispatch(session, lesson, { type: "next" }).session;
    const activityBEvaluation = {
      ...makeEvaluation(1, true),
      activityId: activityB.id,
    };
    session = dispatch(session, lesson, {
      type: "submit",
      evaluation: activityBEvaluation,
      feedback: makeFeedback(),
    }).session;
    expect(isLastActivity(session, lesson)).toBe(true);
    expect(canFinish(session, lesson)).toBe(true);

    const finished = dispatch(session, lesson, { type: "finish", now: NOW });
    expect(finished.session.phase).toBe("completed");
    expect(finished.finishPayload).toBeDefined();
    expect(finished.finishPayload?.bestScores).toEqual({
      [activityA.id]: 1,
      [activityB.id]: 1,
    });
  });

  it("retém finish quando faltam bestScores de atividades obrigatórias", () => {
    const singleActivityLesson = lessons.find(
      (item) => item.completion.requiredActivityIds.length >= 1 && item.activities.length >= 1,
    );
    if (!singleActivityLesson) throw new Error("lição com atividade obrigatória ausente");
    const requiredId = singleActivityLesson.completion.requiredActivityIds[0];
    let session = createLessonSession(singleActivityLesson.id, "initial");
    session = dispatch(session, singleActivityLesson, { type: "start", now: NOW }).session;
    // Não submete nada, mas tenta finalizar.
    const finished = dispatch(session, singleActivityLesson, { type: "finish", now: NOW });
    expect(finished.finishPayload).toBeUndefined();
    expect(requiredActivitiesPassed(session, [requiredId])).toBe(false);
  });

  it("clampa duração negativa ou zero para 0", () => {
    const singleActivityLesson = lessons.find((item) => item.activities.length > 0);
    if (!singleActivityLesson) throw new Error("lição ausente");
    const activity = currentActivity(
      createLessonSession(singleActivityLesson.id, "initial"),
      singleActivityLesson,
    );
    if (!activity) throw new Error("atividade ausente");

    let session = createLessonSession(singleActivityLesson.id, "initial");
    session = dispatch(session, singleActivityLesson, { type: "start", now: NOW }).session;
    session = dispatch(session, singleActivityLesson, {
      type: "submit",
      evaluation: {
        activityId: activity.id,
        activityType: activity.type,
        checks: [],
        deterministicChecks: {},
        score: 1,
        pass: true,
      },
      feedback: makeFeedback(),
    }).session;

    const beforeStart = dispatch(session, singleActivityLesson, {
      type: "finish",
      now: new Date(NOW.getTime() - 1000),
    });
    expect(beforeStart.finishPayload?.durationSeconds).toBe(0);

    const sameTime = dispatch(session, singleActivityLesson, { type: "finish", now: NOW });
    expect(sameTime.finishPayload?.durationSeconds).toBe(0);
  });

  it("preserva o modo (initial/review) no payload de finish", () => {
    const singleActivityLesson = lessons.find((item) => item.activities.length > 0);
    if (!singleActivityLesson) throw new Error("lição ausente");
    const activity = currentActivity(
      createLessonSession(singleActivityLesson.id, "review"),
      singleActivityLesson,
    );
    if (!activity) throw new Error("atividade ausente");

    let session = createLessonSession(singleActivityLesson.id, "review");
    session = dispatch(session, singleActivityLesson, { type: "start", now: NOW }).session;
    session = dispatch(session, singleActivityLesson, {
      type: "submit",
      evaluation: {
        activityId: activity.id,
        activityType: activity.type,
        checks: [],
        deterministicChecks: {},
        score: 1,
        pass: true,
      },
      feedback: makeFeedback(),
    }).session;

    const finished = dispatch(session, singleActivityLesson, {
      type: "finish",
      now: new Date(NOW.getTime() + 5000),
    });
    expect(finished.session.mode).toBe("review");
    expect(finished.finishPayload?.durationSeconds).toBe(5);
  });
});

// Helper local para inferir o tipo de feedback sem expor detalhes.
function bestAttempt(
  session: ReturnType<typeof createLessonSession>,
  activityId: string,
): ReturnType<typeof latestAttempt> {
  return session.best[activityId];
}
