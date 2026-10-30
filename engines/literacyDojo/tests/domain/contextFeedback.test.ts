import { describe, expect, it } from "vitest";
import { DeterministicFeedbackProvider } from "../../src/adapters/deterministicFeedbackProvider";
import { lessons } from "../../src/data/generated/lessons";
import { addExtraContextFeedback, selectedExtraContextIds } from "../../src/domain/contextFeedback";
import { evaluateActivity } from "../../src/domain/evaluation";
import { makeServices } from "../helpers";

const activity = lessons.find((lesson) => lesson.id === "l01")?.activities[2];
if (!activity || activity.type !== "missing_context") throw new Error("atividade ausente");
const provider = new DeterministicFeedbackProvider();
const answer = { contextIds: ["tarefa-definida", "temperatura", "temperatura", "desconhecido"] };

describe("detalhe de feedback para contexto extra", () => {
  it("usa IDs do catálogo, sem duplicar ou revelar outras opções", () => {
    const evaluation = evaluateActivity(activity, answer);
    const base = provider.feedbackFor(activity, evaluation);
    const ids = selectedExtraContextIds(activity, answer);
    expect(ids).toEqual(["temperatura"]);
    const output = addExtraContextFeedback(activity, evaluation, base, ids);
    expect(output.perCheck.filter((item) => item.checkId === "temperatura")).toHaveLength(1);
    expect(output.perCheck.find((item) => item.checkId === "temperatura")?.message).toBe(
      activity.feedback.perCheck?.temperatura,
    );
    expect(output.perCheck.some((item) => item.checkId === "nome-do-modelo-de-ia")).toBe(false);
    expect(base.perCheck.some((item) => item.checkId === "temperatura")).toBe(false);
  });
  it("não altera feedback aprovado, sem mensagem ou já detalhado pelo provider", () => {
    const correct = { contextIds: [...activity.evaluation.requiredContextIds] };
    const pass = evaluateActivity(activity, correct);
    const base = provider.feedbackFor(activity, pass);
    expect(addExtraContextFeedback(activity, pass, base, ["temperatura"])).toBe(base);
    const fail = evaluateActivity(activity, answer);
    const missingMessage = { ...activity, feedback: { ...activity.feedback, perCheck: {} } };
    const failedBase = provider.feedbackFor(activity, fail);
    expect(addExtraContextFeedback(missingMessage, fail, failedBase, ["temperatura"])).toBe(
      failedBase,
    );
    const custom = {
      ...failedBase,
      perCheck: [
        ...failedBase.perCheck,
        { checkId: "temperatura", passed: false, message: "custom" },
      ],
    };
    expect(
      addExtraContextFeedback(activity, fail, custom, ["temperatura"]).perCheck.filter(
        (item) => item.checkId === "temperatura",
      ),
    ).toHaveLength(1);
  });
  it("exibe ambos os extras selecionados na ordem do catálogo", () => {
    const submitted = { contextIds: ["temperatura", "nome-do-modelo-de-ia"] };
    const evaluation = evaluateActivity(activity, submitted);
    const result = addExtraContextFeedback(
      activity,
      evaluation,
      provider.feedbackFor(activity, evaluation),
      selectedExtraContextIds(activity, submitted),
    );
    expect(
      result.perCheck
        .filter((item) => ["temperatura", "nome-do-modelo-de-ia"].includes(item.checkId))
        .map((item) => item.checkId),
    ).toEqual(["nome-do-modelo-de-ia", "temperatura"]);
  });
  it("mantém captura da tentativa original mesmo se a resposta for editada", () => {
    const submitted = { contextIds: ["temperatura"] };
    const ids = selectedExtraContextIds(activity, submitted);
    const evaluation = evaluateActivity(activity, submitted);
    submitted.contextIds.splice(0, 1);
    const feedback = addExtraContextFeedback(
      activity,
      evaluation,
      provider.feedbackFor(activity, evaluation),
      ids,
    );
    expect(feedback.perCheck.find((item) => item.checkId === "temperatura")?.message).toBeTruthy();
  });
  it("no caso de uso preserva avaliação e evidência e retorna detalhe transitório", async () => {
    const { services } = makeServices();
    const submitted = { contextIds: ["tarefa-definida", "temperatura"] };
    const expected = evaluateActivity(activity, submitted);
    const result = await services.useCases.submitActivityAttempt({
      lessonId: "l01",
      activityId: activity.id,
      answer: submitted,
    });
    expect(result.evaluation).toEqual(expected);
    expect(result.record.deterministicChecks).toEqual(expected.deterministicChecks);
    expect(result.record.answer).toEqual(submitted);
    expect(
      result.feedback.perCheck.find((item) => item.checkId === "temperatura")?.message,
    ).toBeTruthy();
    expect(result.progress.xp).toBe(0);
  });
});
