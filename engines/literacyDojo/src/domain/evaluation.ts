import type {
  ActivityDefinition,
  ChoiceActivity,
  MissingContextActivity,
  OutputComparisonActivity,
  PromptBuilderActivity,
  RubricReviewActivity,
  SafetyClassificationActivity,
  SortActivity,
} from "../data/generated/lessons";

/**
 * Avaliação determinística das atividades — 100% dirigida pelos dados do read
 * model (nenhum texto ou id de conteúdo hardcoded aqui). Os 7 tipos do
 * content-contract estão implementados; tipos futuros desconhecidos lançam
 * UnsupportedActivityTypeError.
 */

export type ChoiceAnswer = {
  optionIds: string[];
};

export type SortAnswer = {
  orderedIds: string[];
};

export type MissingContextAnswer = {
  contextIds: string[];
};

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

export type RubricReviewAnswer = {
  verdicts: Record<string, "met" | "partial" | "not_met">;
};

export type ActivityAnswer =
  | ChoiceAnswer
  | SortAnswer
  | MissingContextAnswer
  | OutputComparisonAnswer
  | PromptBuilderAnswer
  | SafetyClassificationAnswer
  | RubricReviewAnswer;

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
    super(`Tipo de atividade não suportado: ${activityType}`);
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

function fractionPassed(checks: CheckResult[]): number {
  return checks.length === 0 ? 0 : checks.filter((c) => c.passed).length / checks.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function finalize(
  activity: ActivityDefinition,
  checks: CheckResult[],
  pass: boolean,
  score?: number,
): EvaluationResult {
  const computed = score ?? fractionPassed(checks);
  return {
    activityId: activity.id,
    activityType: activity.type,
    checks,
    deterministicChecks: Object.fromEntries(checks.map((check) => [check.id, check.value])),
    score: round2(computed),
    pass,
  };
}

export function evaluateChoice(activity: ChoiceActivity, answer: ChoiceAnswer): EvaluationResult {
  const correct = new Set(activity.evaluation.correctOptionIds);
  const selected = new Set(answer.optionIds);
  // Um check por opção: acertar é marcar as corretas e NÃO marcar as demais.
  const checks: CheckResult[] = activity.data.options.map((option) => {
    const passed = selected.has(option.id) === correct.has(option.id);
    return { id: option.id, passed, value: passed };
  });
  return finalize(activity, checks, fractionPassed(checks) >= ACTIVITY_PASS_THRESHOLD);
}

export function evaluateSort(activity: SortActivity, answer: SortAnswer): EvaluationResult {
  const expected = activity.evaluation.expectedOrder;
  const checks: CheckResult[] = expected.map((itemId, index) => {
    const passed = answer.orderedIds[index] === itemId;
    return { id: itemId, passed, value: passed };
  });
  return finalize(activity, checks, fractionPassed(checks) >= ACTIVITY_PASS_THRESHOLD);
}

export function evaluateMissingContext(
  activity: MissingContextActivity,
  answer: MissingContextAnswer,
): EvaluationResult {
  const required = new Set(activity.evaluation.requiredContextIds);
  const selected = new Set(answer.contextIds);
  const extraSelected = [...selected].filter((id) => !required.has(id));
  const checks: CheckResult[] = [
    ...activity.evaluation.requiredContextIds.map((contextId) => ({
      id: contextId,
      passed: selected.has(contextId),
      value: selected.has(contextId),
    })),
    { id: "noExtraContext", passed: extraSelected.length === 0, value: extraSelected.length },
  ];
  const pass =
    activity.evaluation.requiredContextIds.every((id) => selected.has(id)) &&
    extraSelected.length === 0;
  return finalize(activity, checks, pass);
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

  // Score ponderado: a saída certa vale 2; critérios e "sem extras" valem 1.
  const weights = new Map<string, number>([["betterOutputId", 2]]);
  const earned = checks
    .filter((check) => check.passed)
    .reduce((total, check) => total + (weights.get(check.id) ?? 1), 0);
  const total = checks.reduce((sum, check) => sum + (weights.get(check.id) ?? 1), 0);
  const score = total === 0 ? 0 : earned / total;

  const pass =
    answer.outputId === betterOutputId &&
    requiredCriterionIds.every((id) => selected.has(id)) &&
    extraSelected.length === 0;

  return finalize(activity, checks, pass, score);
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
  return finalize(activity, checks, fractionPassed(checks) >= ACTIVITY_PASS_THRESHOLD);
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
  return finalize(activity, checks, fractionPassed(checks) >= ACTIVITY_PASS_THRESHOLD);
}

export function evaluateRubricReview(
  activity: RubricReviewActivity,
  answer: RubricReviewAnswer,
): EvaluationResult {
  const expected = activity.evaluation.expectedVerdicts;
  const checks: CheckResult[] = activity.data.criteria.map((criterion) => {
    const given = answer.verdicts[criterion.id];
    const passed = given !== undefined && given === expected[criterion.id];
    return { id: criterion.id, passed, value: passed };
  });
  return finalize(activity, checks, fractionPassed(checks) >= ACTIVITY_PASS_THRESHOLD);
}

export function evaluateActivity(
  activity: ActivityDefinition,
  answer: ActivityAnswer,
): EvaluationResult {
  switch (activity.type) {
    case "choice":
      return evaluateChoice(activity, answer as ChoiceAnswer);
    case "sort":
      return evaluateSort(activity, answer as SortAnswer);
    case "missing_context":
      return evaluateMissingContext(activity, answer as MissingContextAnswer);
    case "output_comparison":
      return evaluateOutputComparison(activity, answer as OutputComparisonAnswer);
    case "prompt_builder":
      return evaluatePromptBuilder(activity, answer as PromptBuilderAnswer);
    case "safety_classification":
      return evaluateSafetyClassification(activity, answer as SafetyClassificationAnswer);
    case "rubric_review":
      return evaluateRubricReview(activity, answer as RubricReviewAnswer);
    default:
      throw new UnsupportedActivityTypeError((activity as ActivityDefinition).type);
  }
}
