import { expect, it } from "vitest";
import { DeterministicFeedbackProvider } from "../../src/adapters/deterministicFeedbackProvider";
import { lessons } from "../../src/data/generated/lessons";
import { evaluateOutputComparison } from "../../src/domain/evaluation";

it("explica o motivo extra sem sobrescrever mensagem específica do conteúdo", () => {
  const activity = lessons
    .find((lesson) => lesson.id === "l02")
    ?.activities.find((item) => item.id === "l02-a1");
  if (!activity || activity.type !== "output_comparison") throw new Error("atividade ausente");
  const provider = new DeterministicFeedbackProvider();
  const answer = { outputId: "out-b", criterionIds: ["c-fontes", "c-limites", "c-confianca"] };
  const evaluation = evaluateOutputComparison(activity, answer);
  expect(evaluation.pass).toBe(false);
  expect(
    provider
      .feedbackFor(activity, evaluation)
      .perCheck.find((check) => check.checkId === "noExtraCriteria")?.message,
  ).toContain("critérios exigidos");
  const authored = {
    ...activity,
    feedback: {
      ...activity.feedback,
      perCheck: { ...activity.feedback.perCheck, noExtraCriteria: "Mensagem própria" },
    },
  };
  expect(
    provider
      .feedbackFor(authored, evaluation)
      .perCheck.find((check) => check.checkId === "noExtraCriteria")?.message,
  ).toBe("Mensagem própria");
  const correct = evaluateOutputComparison(activity, {
    ...answer,
    criterionIds: ["c-fontes", "c-limites"],
  });
  expect(
    provider
      .feedbackFor(activity, correct)
      .perCheck.find((check) => check.checkId === "noExtraCriteria")?.message,
  ).toBeUndefined();
});
