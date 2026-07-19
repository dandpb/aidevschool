import type {
  ActivityDefinition,
  OutputComparisonActivity,
  PromptBuilderActivity,
  SafetyClassificationActivity,
} from "../data/generated/lessons";

/**
 * Avaliação determinística das atividades — 100% dirigida pelos dados do read
 * model (nenhum texto ou id de conteúdo hardcoded aqui). O vertical slice
 * implementa os três tipos das lições piloto; os demais tipos do contrato
 * entram na Fase 2 e hoje lançam UnsupportedActivityTypeError.
 */

export type OutputComparisonAnswer = {
  outputId?: string;
  criterionIds: string[];
};

export type PromptBuilderAnswer = {
  values: Record<string, string>;
};

export type SafetyClassificationAnswer = {
  labels: Record<string, "safe" | "sensitive">;
};

export type ActivityAnswer =
  | OutputComparisonAnswer
  | PromptBuilderAnswer
  | SafetyClassificationAnswer;

export type CheckValue = boolean | number | string;

export type CheckResult = {
  id: string;
  passed: boolean;
  value: CheckValue;
};

export type EvaluationResult = {
  activityId: string;
  activityType: string;
  checks: CheckResult[];
  deterministicChecks: Record<string, CheckValue>;
  /** 0..1 — fração ponderada dos checks atendidos. */
  score: number;
  pass: boolean;
};

/**
 * Limiar de aprovação de atividade do MVP. Coincide com o `minimumScore` das
 * lições piloto, mas é política do engine (o conteúdo pode exigir média maior
 * na conclusão da lição via `completion.minimumScore`).
 */
export const ACTIVITY_PASS_THRESHOLD = 0.75;

export class UnsupportedActivityTypeError extends Error {
  constructor(activityType: string) {
    super(`Tipo de atividade não suportado no vertical slice: ${activityType}`);
    this.name = "UnsupportedActivityTypeError";
  }
}

function normalizeText(value: string): string {
  return (
    value
      .normalize("NFD")
      // biome-ignore lint/suspicious/noMisleadingCharacterClass: a intenção é justamente remover os diacríticos combinantes (U+0300–U+036F) após a decomposição NFD.
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  );
}

function includesAny(text: string, alternatives: string[]): boolean {
  const haystack = normalizeText(text);
  return alternatives.some((alternative) => haystack.includes(normalizeText(alternative)));
}

function finalize(
  activity: ActivityDefinition,
  checks: CheckResult[],
  pass: boolean,
  totalWeight?: number,
): EvaluationResult {
  const earned = checks
    .filter((check) => check.passed)
    .reduce((total, check) => total + weightOf(check.id, activity.type), 0);
  const total =
    totalWeight ?? checks.reduce((sum, check) => sum + weightOf(check.id, activity.type), 0);
  const score = total === 0 ? 0 : Math.round((earned / total) * 100) / 100;
  return {
    activityId: activity.id,
    activityType: activity.type,
    checks,
    deterministicChecks: Object.fromEntries(checks.map((check) => [check.id, check.value])),
    score,
    pass,
  };
}

function weightOf(checkId: string, activityType: string): number {
  if (activityType === "output_comparison") {
    if (checkId === "betterOutputId") return 2;
    if (checkId === "noExtraCriteria") return 1;
    return 1;
  }
  return 1;
}

export function evaluateOutputComparison(
  activity: OutputComparisonActivity,
  answer: OutputComparisonAnswer,
): EvaluationResult {
  const { betterOutputId, requiredCriterionIds } = activity.evaluation;
  const selected = new Set(answer.criterionIds);
  const required = new Set(requiredCriterionIds);
  const extraSelected = [...selected].filter((id) => !required.has(id));

  const checks: CheckResult[] = [
    {
      id: "betterOutputId",
      passed: answer.outputId === betterOutputId,
      value: answer.outputId === betterOutputId,
    },
    ...requiredCriterionIds.map((criterionId) => ({
      id: criterionId,
      passed: selected.has(criterionId),
      value: selected.has(criterionId),
    })),
    {
      id: "noExtraCriteria",
      passed: extraSelected.length === 0,
      value: extraSelected.length,
    },
  ];

  const pass =
    answer.outputId === betterOutputId &&
    requiredCriterionIds.every((id) => selected.has(id)) &&
    extraSelected.length === 0;

  return finalize(activity, checks, pass);
}

export function evaluatePromptBuilder(
  activity: PromptBuilderActivity,
  answer: PromptBuilderAnswer,
): EvaluationResult {
  const checks: CheckResult[] = activity.data.fields.map((field) => {
    const rules = activity.evaluation.fields[field.id] ?? {};
    const value = (answer.values[field.id] ?? "").trim();
    let passed = true;
    if (rules.minLength !== undefined && value.length < rules.minLength) passed = false;
    if (rules.maxLength !== undefined && value.length > rules.maxLength) passed = false;
    if (rules.mustIncludeAny !== undefined && !includesAny(value, rules.mustIncludeAny)) {
      passed = false;
    }
    return { id: field.id, passed, value: passed };
  });
  const score = checks.length === 0 ? 0 : checks.filter((c) => c.passed).length / checks.length;
  const pass = score >= ACTIVITY_PASS_THRESHOLD;
  return finalize(activity, checks, pass, checks.length);
}

export function evaluateSafetyClassification(
  activity: SafetyClassificationActivity,
  answer: SafetyClassificationAnswer,
): EvaluationResult {
  const expected = activity.evaluation.classification;
  const checks: CheckResult[] = activity.data.items.map((item) => {
    const given = answer.labels[item.id];
    const passed = given !== undefined && given === expected[item.id];
    return { id: item.id, passed, value: passed };
  });
  const correct = checks.filter((check) => check.passed).length;
  const pass = checks.length > 0 && correct / checks.length >= ACTIVITY_PASS_THRESHOLD;
  return finalize(activity, checks, pass, checks.length);
}

export function evaluateActivity(
  activity: ActivityDefinition,
  answer: ActivityAnswer,
): EvaluationResult {
  switch (activity.type) {
    case "output_comparison":
      return evaluateOutputComparison(activity, answer as OutputComparisonAnswer);
    case "prompt_builder":
      return evaluatePromptBuilder(activity, answer as PromptBuilderAnswer);
    case "safety_classification":
      return evaluateSafetyClassification(activity, answer as SafetyClassificationAnswer);
    default:
      throw new UnsupportedActivityTypeError(activity.type);
  }
}
