import type { AttemptFeedback } from "../domain/feedback";

/** Painel de feedback formativo: "ainda falta X" por check + dicas progressivas. */
export function FeedbackPanel({
  feedback,
  hintsShown,
}: {
  feedback: AttemptFeedback;
  hintsShown: string[];
}) {
  const failures = feedback.perCheck.filter((check) => !check.passed && check.message);
  return (
    <div
      className={`feedback ${feedback.pass ? "feedback-pass" : "feedback-fail"}`}
      aria-live="polite"
      aria-atomic="true"
      data-testid="feedback-panel"
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
      {hintsShown.length > 0 && (
        <div className="hints" data-testid="hints-list">
          <p className="muted">Dicas:</p>
          <ol>
            {hintsShown.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
