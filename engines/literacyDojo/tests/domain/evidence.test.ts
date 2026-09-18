import { describe, expect, it } from "vitest";
import type { EvaluationResult } from "../../src/domain/evaluation";
import { buildEvidenceRecord } from "../../src/domain/evidence";
import type { ActivityAnswer } from "../../src/domain/evaluation";

function evaluation(): EvaluationResult {
  return {
    activityId: "l18-a1",
    activityType: "prompt_builder",
    checks: [],
    deterministicChecks: { tarefa: true },
    score: 0.8,
    pass: true,
  };
}

function buildWith(answer: ActivityAnswer) {
  return buildEvidenceRecord({
    attemptId: "attempt-1",
    lessonId: "l18",
    lessonVersion: 2,
    skillIds: ["pedir"],
    evaluation: evaluation(),
    answer,
    timestamp: "2026-09-18T12:00:00.000Z",
  });
}

const structuredCases: Array<[string, ActivityAnswer, unknown]> = [
  ["optionIds", { optionIds: ["o1", "o2"] }, { optionIds: ["o1", "o2"] }],
  ["orderedIds", { orderedIds: ["a", "b"] }, { orderedIds: ["a", "b"] }],
  ["contextIds", { contextIds: ["c1"] }, { contextIds: ["c1"] }],
  [
    "criterionIds",
    { outputId: "out1", criterionIds: ["k1"] },
    { outputId: "out1", criterionIds: ["k1"] },
  ],
  ["labels", { labels: { i1: "safe" } }, { labels: { i1: "safe" } }],
  ["verdicts", { verdicts: { v1: "met" } }, { verdicts: { v1: "met" } }],
];

describe("structuredAnswer transport (prompt_builder values)", () => {
  it("emits per-field values for prompt_builder answers", () => {
    const record = buildWith({
      values: { tarefa: "Resumir o desempenho", formato: "Tópicos" },
    });
    expect(record.answer).toEqual({
      values: { tarefa: "Resumir o desempenho", formato: "Tópicos" },
    });
  });

  it("deep-copies values (mutating the answer cannot change the record)", () => {
    const answer: { values: Record<string, string> } = { values: { tarefa: "original" } };
    const record = buildWith(answer);
    answer.values.tarefa = "mutated";
    expect((record.answer as { values: Record<string, string> }).values.tarefa).toBe("original");
  });

  it.each(structuredCases)(
    "%s passes through unchanged (no regression)",
    (_name, answer, expected) => {
      const record = buildWith(answer);
      expect(record.answer).toEqual(expected);
    },
  );
});
