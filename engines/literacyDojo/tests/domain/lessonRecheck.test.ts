import { describe, expect, it } from "vitest";
import { DeterministicFeedbackProvider } from "../../src/adapters/deterministicFeedbackProvider";
import { lessons } from "../../src/data/generated/lessons";
import { evaluateActivity } from "../../src/domain/evaluation";
import {
  createLessonSession,
  nextActivity,
  recordHint,
  setAnswer,
  startSession,
  submitAttempt,
} from "../../src/domain/lessonSession";

const lesson = lessons.find((item) => item.id === "l02");
if (!lesson) throw new Error("lição ausente");
const activity = lesson.activities[0];
if (!activity || activity.type !== "output_comparison") throw new Error("atividade ausente");
const feedback = new DeterministicFeedbackProvider();
const wrong = { outputId: "out-a", criterionIds: [] };
const correct = { outputId: "out-b", criterionIds: ["c-fontes", "c-limites"] };

describe("reverificação da lição", () => {
  it("atualiza tentativa e melhor resultado sem exigir reinício", () => {
    let session = startSession(createLessonSession(lesson.id), new Date());
    session = setAnswer(session, lesson, wrong);
    const first = evaluateActivity(activity, wrong);
    session = submitAttempt(session, lesson, first, feedback.feedbackFor(activity, first));
    expect(session.attempts[activity.id]?.evaluation.pass).toBe(false);
    session = setAnswer(session, lesson, correct);
    const second = evaluateActivity(activity, correct);
    session = submitAttempt(session, lesson, second, feedback.feedbackFor(activity, second));
    expect(session.attempts[activity.id]?.evaluation.pass).toBe(true);
    expect(session.best[activity.id]?.evaluation.score).toBe(1);
    expect(nextActivity(session, lesson).currentActivityIndex).toBe(1);
  });
  it("atualiza feedback pior preservando melhor resultado e dica", () => {
    let session = startSession(createLessonSession(lesson.id), new Date());
    const first = evaluateActivity(activity, wrong);
    session = submitAttempt(session, lesson, first, feedback.feedbackFor(activity, first));
    session = recordHint(session, lesson, "dica preservada");
    const worse = { outputId: "out-a", criterionIds: ["c-confianca"] };
    session = setAnswer(session, lesson, worse);
    const second = evaluateActivity(activity, worse);
    session = submitAttempt(session, lesson, second, feedback.feedbackFor(activity, second));
    expect(session.attempts[activity.id]?.evaluation.score).toBeLessThan(first.score);
    expect(session.best[activity.id]?.evaluation.score).toBe(first.score);
    expect(session.hints[activity.id]?.shown).toEqual(["dica preservada"]);
  });
  it("não substitui uma tentativa já aprovada por reenvio inesperado", () => {
    let session = startSession(createLessonSession(lesson.id), new Date());
    const good = evaluateActivity(activity, correct);
    session = submitAttempt(session, lesson, good, feedback.feedbackFor(activity, good));
    const bad = evaluateActivity(activity, wrong);
    expect(submitAttempt(session, lesson, bad, feedback.feedbackFor(activity, bad))).toBe(session);
  });
});
