import type { AttemptFeedback } from "../domain/feedback";

type ReviewActivity = {
  id: string;
  index: number;
  instruction?: string;
  pass: boolean;
  feedback: AttemptFeedback;
};

/** Pontos de atividades aceitas, a partir do feedback já mantido na sessão. */
export function ReviewPoints({ activities }: { activities: ReviewActivity[] }) {
  const points = activities
    .filter(
      (activity) => activity.pass && activity.feedback.perCheck.some((check) => !check.passed),
    )
    .map((activity) => {
      const failed = activity.feedback.perCheck.filter((check) => !check.passed);
      return {
        ...activity,
        messages: [
          ...new Set(
            failed
              .map((check) => check.message)
              .filter((message): message is string => Boolean(message)),
          ),
        ],
        missingDetail: failed.some((check) => !check.message),
      };
    });
  if (points.length === 0) return null;
  return (
    <div className="card" data-testid="result-review-points">
      <h2>Pontos para revisar</h2>
      {points.map((point) => (
        <section key={point.id}>
          <h3>{point.index >= 0 ? `Atividade ${point.index + 1}` : "Atividade"}</h3>
          {point.instruction && <p>{point.instruction}</p>}
          <p>{point.feedback.summary}</p>
          {point.messages.length > 0 && (
            <ul>
              {point.messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {point.missingDetail && (
            <p>Alguns detalhes desta tentativa não estão disponíveis aqui.</p>
          )}
        </section>
      ))}
    </div>
  );
}
