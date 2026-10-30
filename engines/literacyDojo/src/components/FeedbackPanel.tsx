import type { Ref } from "react";
import type { AttemptFeedback } from "../domain/feedback";
import { HintList } from "./HintList";

/** Painel de feedback formativo: "ainda falta X" por check + dicas progressivas. */
export function FeedbackPanel({
  feedback,
  hintsShown,
  focusRef,
}: {
  feedback: AttemptFeedback;
  hintsShown: string[];
  focusRef?: Ref<HTMLDivElement>;
}) {
  const failures = feedback.perCheck.filter((check) => !check.passed && check.message);
  return (
    <div
      className={`feedback ${feedback.pass ? "feedback-pass" : "feedback-fail"}`}
      aria-live="polite"
      aria-atomic="true"
      data-testid="feedback-panel"
      ref={focusRef}
      tabIndex={focusRef ? -1 : undefined}
    >
      <p className="feedback-summary">{feedback.summary}</p>
      {!feedback.pass && (
        <p className="muted">Pontuação desta tentativa: {Math.round(feedback.score * 100)}%</p>
      )}
      {failures.length > 0 && (
        <ul className="feedback-list">
          {failures.map((check) => (
            <li key={check.checkId} data-testid={`feedback-check-${check.checkId}`}>
              {check.message}
            </li>
          ))}
        </ul>
      )}
      <HintList hints={hintsShown} />
    </div>
  );
}
