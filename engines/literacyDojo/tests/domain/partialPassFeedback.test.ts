import { describe, expect, it } from "vitest";
import { DeterministicFeedbackProvider } from "../../src/adapters/deterministicFeedbackProvider";
import { lessons } from "../../src/data/generated/lessons";
import { evaluateActivity } from "../../src/domain/evaluation";

const activity = lessons.find((lesson) => lesson.id === "l12")?.activities[0];
if (!activity || activity.type !== "safety_classification") throw new Error("atividade ausente");
const provider = new DeterministicFeedbackProvider();
const correct = { labels: { ...activity.evaluation.classification } };

describe("feedback de aprovação parcial", () => {
  it("sinaliza pontos restantes sem mudar aprovação ou feedback específico", () => {
    const evaluation = evaluateActivity(activity, {
      labels: { ...correct.labels, "i-senha": "safe" },
    });
    expect(evaluation.pass).toBe(true);
    expect(evaluation.deterministicChecks["i-senha"]).toBe(false);
    const feedback = provider.feedbackFor(activity, evaluation);
    expect(feedback.summary).toContain("pontos para revisar");
    expect(feedback.perCheck.find((check) => check.checkId === "i-senha")?.message).toBe(
      activity.feedback.perCheck?.["i-senha"],
    );
    expect(feedback.score).toBe(evaluation.score);
  });
  it("não promete detalhes quando faltam mensagens específicas", () => {
    const evaluation = evaluateActivity(activity, {
      labels: { ...correct.labels, "i-senha": "safe" },
    });
    const withoutMessages = { ...activity, feedback: { ...activity.feedback, perCheck: {} } };
    const feedback = provider.feedbackFor(withoutMessages, evaluation);
    expect(feedback.summary).toContain("pontos para revisar");
    expect(feedback.summary).not.toContain("abaixo");
    expect(feedback.perCheck.find((check) => check.checkId === "i-senha")?.message).toBeUndefined();
  });
  it("mantém texto do conteúdo quando todos os checks passam", () => {
    const evaluation = evaluateActivity(activity, correct);
    expect(evaluation.checks.every((check) => check.passed)).toBe(true);
    expect(provider.feedbackFor(activity, evaluation).summary).toBe(activity.feedback.onSuccess);
  });
  it("mantém texto de falha quando a nota fica abaixo do limite", () => {
    const labels = Object.fromEntries(
      activity.data.items.map((item) => [item.id, "safe" as const]),
    );
    const evaluation = evaluateActivity(activity, { labels });
    expect(evaluation.pass).toBe(false);
    expect(provider.feedbackFor(activity, evaluation).summary).toBe(activity.feedback.onFailure);
  });
});
