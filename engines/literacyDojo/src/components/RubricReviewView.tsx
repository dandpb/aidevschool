import type { RubricReviewActivity } from "../data/generated/lessons";
import type { RubricReviewAnswer } from "../domain/evaluation";

const VERDICTS: { value: "met" | "partial" | "not_met"; label: string }[] = [
  { value: "met", label: "Atende" },
  { value: "partial", label: "Parcialmente" },
  { value: "not_met", label: "Não atende" },
];

export function RubricReviewView({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: {
  activity: RubricReviewActivity;
  answer: RubricReviewAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: RubricReviewAnswer) => void;
}) {
  const { responseText, criteria } = activity.data;

  return (
    <div className="activity">
      <blockquote className="generic-prompt">
        <span className="muted">A resposta da IA:</span>
        <br />“{responseText}”
      </blockquote>
      {criteria.map((criterion) => (
        <fieldset
          key={criterion.id}
          className={`fieldset rubric-criterion${invalidIds.includes(criterion.id) ? " is-invalid" : ""}`}
          data-testid={`rubric-${criterion.id}`}
        >
          <legend>{criterion.text}</legend>
          <div className="segmented">
            {VERDICTS.map((verdict) => (
              <label
                key={verdict.value}
                className={`segment${
                  answer.verdicts[criterion.id] === verdict.value ? " is-selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name={`rubric-${criterion.id}`}
                  data-testid={`rubric-${criterion.id}-${verdict.value}`}
                  checked={answer.verdicts[criterion.id] === verdict.value}
                  disabled={disabled}
                  onChange={() =>
                    onChange({
                      verdicts: { ...answer.verdicts, [criterion.id]: verdict.value },
                    })
                  }
                />
                {verdict.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
