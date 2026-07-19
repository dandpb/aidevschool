import { describe, expect, it } from "vitest";
import type {
  ActivityDefinition,
  OutputComparisonActivity,
  PromptBuilderActivity,
  SafetyClassificationActivity,
} from "../../src/data/generated/lessons";
import { lessons } from "../../src/data/generated/lessons";
import {
  UnsupportedActivityTypeError,
  evaluateActivity,
  evaluateOutputComparison,
  evaluatePromptBuilder,
  evaluateSafetyClassification,
} from "../../src/domain/evaluation";

/**
 * Testes dirigidos pelo read model gerado: nenhuma resposta "certa" é
 * hardcoded aqui — tudo deriva de activity.evaluation.
 */

function activityOf<T extends ActivityDefinition>(lessonId: string, type: string): T {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error(`lição ${lessonId} ausente do read model`);
  const activity = lesson.activities.find((item) => item.type === type);
  if (!activity) throw new Error(`atividade ${type} ausente em ${lessonId}`);
  return activity as T;
}

const outputComparison = activityOf<OutputComparisonActivity>("l02", "output_comparison");
const promptBuilder = activityOf<PromptBuilderActivity>("l05", "prompt_builder");
const safety = activityOf<SafetyClassificationActivity>("l12", "safety_classification");

function goodPromptValues(activity: PromptBuilderActivity, tokenIndex = 0): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of activity.data.fields) {
    const rules = activity.evaluation.fields[field.id] ?? {};
    const token = rules.mustIncludeAny?.[tokenIndex] ?? rules.mustIncludeAny?.[0] ?? "conteúdo";
    const minLength = rules.minLength ?? 1;
    // Token no início + preenchimento para atingir minLength com sobra.
    values[field.id] = `${token} ${"x".repeat(minLength)}`;
  }
  return values;
}

describe("output_comparison (l02)", () => {
  const better = outputComparison.evaluation.betterOutputId;
  const required = outputComparison.evaluation.requiredCriterionIds;
  const wrongOutput = outputComparison.data.outputs.find((output) => output.id !== better)?.id;
  const extraCriterion = outputComparison.data.criteria.find(
    (criterion) => !required.includes(criterion.id),
  )?.id;

  it("resposta certa completa: passa com score 1 e checks estruturados", () => {
    const result = evaluateOutputComparison(outputComparison, {
      outputId: better,
      criterionIds: [...required],
    });
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
    expect(result.deterministicChecks.betterOutputId).toBe(true);
    expect(result.deterministicChecks.noExtraCriteria).toBe(0);
  });

  it("saída errada: não passa e marca betterOutputId como falso", () => {
    const result = evaluateOutputComparison(outputComparison, {
      outputId: wrongOutput,
      criterionIds: [...required],
    });
    expect(result.pass).toBe(false);
    expect(result.deterministicChecks.betterOutputId).toBe(false);
    expect(result.checks.find((check) => check.id === "betterOutputId")?.passed).toBe(false);
  });

  it("resposta parcial: saída certa com critério obrigatório faltando não passa", () => {
    const result = evaluateOutputComparison(outputComparison, {
      outputId: better,
      criterionIds: required.slice(0, 1),
    });
    expect(result.pass).toBe(false);
    const missing = result.checks.find((check) => !check.passed);
    expect(missing).toBeDefined();
    expect(required).toContain(missing?.id);
  });

  it("critério extra (armadilha) derruba a tentativa mesmo com o resto certo", () => {
    if (!extraCriterion) throw new Error("conteúdo sem critério-armadilha");
    const result = evaluateOutputComparison(outputComparison, {
      outputId: better,
      criterionIds: [...required, extraCriterion],
    });
    expect(result.pass).toBe(false);
    expect(result.deterministicChecks.noExtraCriteria).toBe(1);
  });
});

describe("prompt_builder (l05)", () => {
  it("campos corretos: passa com score 1", () => {
    const result = evaluatePromptBuilder(promptBuilder, {
      values: goodPromptValues(promptBuilder),
    });
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it("tokens com acento casam com alternativas sem acento (normalização)", () => {
    const values = goodPromptValues(promptBuilder);
    // Usa a última alternativa de cada campo (nas lições piloto, a variante acentuada).
    for (const field of promptBuilder.data.fields) {
      const rules = promptBuilder.evaluation.fields[field.id] ?? {};
      const alternatives = rules.mustIncludeAny ?? [];
      const accented = alternatives[alternatives.length - 1];
      values[field.id] = `${accented} ${"y".repeat(rules.minLength ?? 1)}`;
    }
    const result = evaluatePromptBuilder(promptBuilder, { values });
    expect(result.pass).toBe(true);
  });

  it("um campo sem o token exigido falha só esse check (parcial 0.75 passa no limiar)", () => {
    const values = goodPromptValues(promptBuilder);
    const [firstField] = promptBuilder.data.fields;
    values[firstField.id] = "texto longo o suficiente mas sem a palavra-chave esperada";
    const result = evaluatePromptBuilder(promptBuilder, { values });
    expect(result.score).toBe(0.75);
    expect(result.pass).toBe(true);
    expect(result.checks.find((check) => check.id === firstField.id)?.passed).toBe(false);
  });

  it("campos vazios: não passa, score 0", () => {
    const result = evaluatePromptBuilder(promptBuilder, { values: {} });
    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe("safety_classification (l12)", () => {
  const expected = safety.evaluation.classification;

  it("classificação perfeita: passa com score 1", () => {
    const result = evaluateSafetyClassification(safety, { labels: { ...expected } });
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it("um erro em 7 itens ainda passa (>= 0.75), com o check do item marcado", () => {
    const [firstItem] = safety.data.items;
    const labels = { ...expected };
    labels[firstItem.id] = expected[firstItem.id] === "safe" ? "sensitive" : "safe";
    const result = evaluateSafetyClassification(safety, { labels });
    expect(result.pass).toBe(true);
    expect(result.checks.find((check) => check.id === firstItem.id)?.passed).toBe(false);
  });

  it("dois erros em 7 itens não passam", () => {
    const labels = { ...expected };
    for (const item of safety.data.items.slice(0, 2)) {
      labels[item.id] = expected[item.id] === "safe" ? "sensitive" : "safe";
    }
    const result = evaluateSafetyClassification(safety, { labels });
    expect(result.pass).toBe(false);
    expect(result.score).toBeCloseTo(5 / 7, 2);
  });
});

describe("tipos fora do vertical slice", () => {
  it("lança UnsupportedActivityTypeError (Fase 2)", () => {
    const fake = {
      id: "l99-a1",
      type: "choice",
      skillId: "entender",
      instruction: "x",
      data: { options: [{ id: "a", text: "a" }] },
      evaluation: { strategy: "deterministic", correctOptionIds: ["a"] },
      feedback: { onFailure: "x" },
      storage: { policy: "none" },
    } as unknown as ActivityDefinition;
    expect(() => evaluateActivity(fake, { criterionIds: [] })).toThrow(
      UnsupportedActivityTypeError,
    );
  });
});
