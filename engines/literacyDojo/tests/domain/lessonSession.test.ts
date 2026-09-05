import { describe, expect, it } from "vitest";
import { lessons } from "../../src/data/generated/lessons";
import {
  canFinish,
  createLessonSession,
  finishLesson,
  hintsFor,
  isLastActivity,
  latestAttempt,
  nextActivity,
  recordHint,
  requiredActivitiesPassed,
  retryCurrentActivity,
  setAnswer,
  startSession,
  submitAttempt,
} from "../../src/domain/lessonSession";

const lesson = lessons.find((item) => item.id === "l03");
if (!lesson) throw new Error("lição l03 ausente do read model");

const [activityA, activityB, activityC] = lesson.activities;
if (!activityA || !activityB || !activityC) {
  throw new Error("lição l03 precisa de 3 atividades (padrão pós-retrofit O3-C1)");
}

const NOW = new Date("2026-07-19T12:00:00.000Z");

function makeEvaluation(score: number, pass: boolean, activityId = activityA.id) {
  return {
    activityId,
    activityType: activityA.type,
    checks: [],
    deterministicChecks: {},
    score,
    pass,
  };
}

/** Percorre TODAS as atividades da lição aprovando cada uma (padrão 3 atividades). */
function passAllActivities(
  targetLesson: (typeof lessons)[number],
  mode: "initial" | "review" = "initial",
) {
  let session = createLessonSession(targetLesson.id, mode);
  session = startSession(session, NOW);
  for (const activity of targetLesson.activities) {
    session = submitAttempt(
      session,
      targetLesson,
      {
        activityId: activity.id,
        activityType: activity.type,
        checks: [],
        deterministicChecks: {},
        score: 1,
        pass: true,
      },
      makeFeedback(),
    );
    session = nextActivity(session, targetLesson);
  }
  return session;
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
    const result = startSession(session, NOW);
    expect(result.phase).toBe("attempting");
    expect(result.currentActivityIndex).toBe(0);
    expect(result.startedAt).toBe(NOW);
  });
});

describe("submit", () => {
  it("registra a tentativa mais recente e a melhor nota", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = startSession(session, NOW);

    session = submitAttempt(session, lesson, makeEvaluation(0.5, false), makeFeedback());
    expect(session.phase).toBe("feedback");
    expect(latestAttempt(session, activityA.id)?.evaluation.score).toBe(0.5);
    expect(latestAttempt(session, activityA.id)).toBe(bestAttempt(session, activityA.id));

    session = retryCurrentActivity(session, lesson);
    session = submitAttempt(session, lesson, makeEvaluation(1, true), makeFeedback());
    expect(session.phase).toBe("feedback");
    expect(latestAttempt(session, activityA.id)?.evaluation.score).toBe(1);
    expect(bestAttempt(session, activityA.id)?.evaluation.score).toBe(1);
  });

  it("mantém a melhor nota quando uma tentativa posterior é pior", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = startSession(session, NOW);
    session = submitAttempt(session, lesson, makeEvaluation(1, true), makeFeedback());
    session = retryCurrentActivity(session, lesson);
    session = submitAttempt(session, lesson, makeEvaluation(0.5, false), makeFeedback());
    expect(bestAttempt(session, activityA.id)?.evaluation.score).toBe(1);
  });
});

describe("hint", () => {
  it("incrementa o índice e registra dicas mostradas", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = startSession(session, NOW);
    session = recordHint(session, lesson, "dica 1");
    expect(hintsFor(session, activityA.id).index).toBe(1);
    expect(hintsFor(session, activityA.id).shown).toEqual(["dica 1"]);

    session = recordHint(session, lesson, null);
    expect(hintsFor(session, activityA.id).index).toBe(2);
    expect(hintsFor(session, activityA.id).shown).toEqual(["dica 1"]);
  });
});

describe("retry", () => {
  it("limpa a resposta e a tentativa atual, voltando para attempting", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = startSession(session, NOW);
    session = setAnswer(session, lesson, { optionIds: ["x"] });
    session = submitAttempt(session, lesson, makeEvaluation(0.5, false), makeFeedback());

    session = retryCurrentActivity(session, lesson);
    expect(session.phase).toBe("attempting");
    expect(latestAttempt(session, activityA.id)).toBeUndefined();
    expect(session.answers[activityA.id]).toBeUndefined();
  });
});

describe("next", () => {
  it("avança para a próxima atividade quando aprovado", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = startSession(session, NOW);
    session = submitAttempt(session, lesson, makeEvaluation(1, true), makeFeedback());
    session = nextActivity(session, lesson);
    expect(session.phase).toBe("attempting");
    expect(session.currentActivityIndex).toBe(1);
  });

  it("não avança quando a tentativa não passou", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = startSession(session, NOW);
    session = submitAttempt(session, lesson, makeEvaluation(0.5, false), makeFeedback());
    session = nextActivity(session, lesson);
    expect(session.currentActivityIndex).toBe(0);
  });
});

describe("finish gating", () => {
  it("só permite finish na última atividade com todas as obrigatórias aprovadas", () => {
    let session = createLessonSession(lesson.id, "initial");
    session = startSession(session, NOW);
    expect(canFinish(session, lesson)).toBe(false);

    session = submitAttempt(session, lesson, makeEvaluation(1, true), makeFeedback());
    // Ainda não é a última atividade (l03 tem 3 atividades pós-retrofit O3-C1).
    expect(isLastActivity(session, lesson)).toBe(false);
    const beforeFinish = finishLesson(session, lesson, NOW);
    expect(beforeFinish.session.phase).not.toBe("completed");
    expect(beforeFinish.finishPayload).toBeUndefined();

    session = nextActivity(session, lesson);
    const activityBEvaluation = {
      ...makeEvaluation(1, true),
      activityId: activityB.id,
    };
    session = submitAttempt(session, lesson, activityBEvaluation, makeFeedback());
    expect(isLastActivity(session, lesson)).toBe(false);

    session = nextActivity(session, lesson);
    const activityCEvaluation = {
      ...makeEvaluation(1, true),
      activityId: activityC.id,
    };
    session = submitAttempt(session, lesson, activityCEvaluation, makeFeedback());
    expect(isLastActivity(session, lesson)).toBe(true);
    expect(canFinish(session, lesson)).toBe(true);

    const finished = finishLesson(session, lesson, NOW);
    expect(finished.session.phase).toBe("completed");
    expect(finished.finishPayload).toBeDefined();
    expect(finished.finishPayload?.bestScores).toEqual({
      [activityA.id]: 1,
      [activityB.id]: 1,
      [activityC.id]: 1,
    });
  });

  it("retém finish quando faltam bestScores de atividades obrigatórias", () => {
    const singleActivityLesson = lessons.find(
      (item) => item.completion.requiredActivityIds.length >= 1 && item.activities.length >= 1,
    );
    if (!singleActivityLesson) throw new Error("lição com atividade obrigatória ausente");
    const requiredId = singleActivityLesson.completion.requiredActivityIds[0];
    let session = createLessonSession(singleActivityLesson.id, "initial");
    session = startSession(session, NOW);
    // Não submete nada, mas tenta finalizar.
    const finished = finishLesson(session, singleActivityLesson, NOW);
    expect(finished.finishPayload).toBeUndefined();
    expect(requiredActivitiesPassed(session, [requiredId])).toBe(false);
  });

  it("clampa duração negativa ou zero para 0", () => {
    const anyLesson = lessons.find((item) => item.activities.length > 0);
    if (!anyLesson) throw new Error("lição ausente");
    const session = passAllActivities(anyLesson);

    const beforeStart = finishLesson(session, anyLesson, new Date(NOW.getTime() - 1000));
    expect(beforeStart.finishPayload?.durationSeconds).toBe(0);

    const sameTime = finishLesson(session, anyLesson, NOW);
    expect(sameTime.finishPayload?.durationSeconds).toBe(0);
  });

  it("preserva o modo (initial/review) no payload de finish", () => {
    const anyLesson = lessons.find((item) => item.activities.length > 0);
    if (!anyLesson) throw new Error("lição ausente");
    const session = passAllActivities(anyLesson, "review");

    const finished = finishLesson(session, anyLesson, new Date(NOW.getTime() + 5000));
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
