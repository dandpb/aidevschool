import type { ActivityDefinition } from "../data/generated/lessons";
import type { ActivityAnswer, EvaluationResult, MissingContextAnswer } from "./evaluation";
import type { AttemptFeedback } from "./feedback";

/** Snapshot only catalog IDs selected as extras, before any asynchronous write. */
export function selectedExtraContextIds(
  activity: ActivityDefinition,
  answer: ActivityAnswer,
): string[] {
  if (activity.type !== "missing_context") return [];
  const selected = new Set((answer as MissingContextAnswer).contextIds);
  const required = new Set(activity.evaluation.requiredContextIds);
  return activity.data.contextOptions
    .filter((option) => selected.has(option.id) && !required.has(option.id))
    .map((option) => option.id);
}

/** Enrich transient feedback only; checks, score, evidence and provider port remain unchanged. */
export function addExtraContextFeedback(
  activity: ActivityDefinition,
  evaluation: EvaluationResult,
  feedback: AttemptFeedback,
  selectedExtras: readonly string[],
): AttemptFeedback {
  if (
    activity.type !== "missing_context" ||
    evaluation.pass ||
    !evaluation.checks.some((check) => check.id === "noExtraContext" && !check.passed)
  )
    return feedback;
  const selected = new Set(selectedExtras);
  const required = new Set(activity.evaluation.requiredContextIds);
  const existing = new Set(feedback.perCheck.map((check) => check.checkId));
  const additions = activity.data.contextOptions.flatMap((option) => {
    const message = activity.feedback.perCheck?.[option.id];
    if (
      !selected.has(option.id) ||
      required.has(option.id) ||
      existing.has(option.id) ||
      !message
    ) {
      return [];
    }
    existing.add(option.id);
    return [{ checkId: option.id, passed: false, message }];
  });
  return additions.length
    ? { ...feedback, perCheck: [...feedback.perCheck, ...additions] }
    : feedback;
}
