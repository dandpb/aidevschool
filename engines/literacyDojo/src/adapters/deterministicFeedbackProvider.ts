import type { FeedbackProvider } from "../application/ports";
import type { ActivityDefinition } from "../data/generated/lessons";
import type { EvaluationResult } from "../domain/evaluation";
import type { AttemptFeedback } from "../domain/feedback";

/**
 * Feedback 100% determinístico e local: mensagens derivadas dos checks da
 * avaliação + textos pré-escritos do conteúdo (feedback.onFailure/onSuccess/
 * perCheck) + dicas progressivas (hints). Nenhuma chamada externa — o app
 * continua funcional sem provider de IA (plano seção 8).
 */
export class DeterministicFeedbackProvider implements FeedbackProvider {
  feedbackFor(activity: ActivityDefinition, evaluation: EvaluationResult): AttemptFeedback {
    return {
      pass: evaluation.pass,
      score: evaluation.score,
      summary: evaluation.pass
        ? (activity.feedback.onSuccess ?? "Muito bem!")
        : activity.feedback.onFailure,
      perCheck: evaluation.checks.map((check) => ({
        checkId: check.id,
        passed: check.passed,
        message: check.passed ? undefined : activity.feedback.perCheck?.[check.id],
      })),
    };
  }

  hintFor(activity: ActivityDefinition, hintIndex: number): string | null {
    const hints = activity.hints ?? [];
    if (hintIndex < 0 || hintIndex >= hints.length) return null;
    return hints[hintIndex];
  }

  hintCount(activity: ActivityDefinition): number {
    return (activity.hints ?? []).length;
  }
}
