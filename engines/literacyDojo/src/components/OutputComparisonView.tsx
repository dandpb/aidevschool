import type { OutputComparisonActivity } from "../data/generated/lessons";
import type { OutputComparisonAnswer } from "../domain/evaluation";
import { toggleId } from "./toggleId";

export function OutputComparisonView({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: {
  activity: OutputComparisonActivity;
  answer: OutputComparisonAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: OutputComparisonAnswer) => void;
}) {
  const { scenario, outputs, criteria } = activity.data;
  const selectedCriteria = new Set(answer.criterionIds);
  const groupName = `output-${activity.id}`;

  const toggleCriterion = (criterionId: string) => {
    onChange({ ...answer, criterionIds: toggleId(answer.criterionIds, criterionId) });
  };

  return (
    <div className="activity">
      {scenario && <p className="scenario">{scenario}</p>}

      <fieldset className="fieldset" aria-describedby={`${activity.id}-outputs-legend`}>
        <legend id={`${activity.id}-outputs-legend`}>Qual resposta é mais confiável?</legend>
        {outputs.map((output, index) => (
          <label
            key={output.id}
            className={`option-card${answer.outputId === output.id ? " is-selected" : ""}${
              invalidIds.includes("betterOutputId") ? " is-invalid" : ""
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={output.id}
              data-testid={`output-${output.id}`}
              checked={answer.outputId === output.id}
              disabled={disabled}
              onChange={() => onChange({ ...answer, outputId: output.id })}
            />
            <span>
              <strong>Resposta {String.fromCharCode(65 + index)}</strong>
              <br />
              {output.text}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="fieldset">
        <legend>Por quê? Marque os motivos que valem para a resposta que você escolheu.</legend>
        {criteria.map((criterion) => (
          <label
            key={criterion.id}
            className={`option-card option-inline${selectedCriteria.has(criterion.id) ? " is-selected" : ""}${
              invalidIds.includes(criterion.id) ? " is-invalid" : ""
            }`}
          >
            <input
              type="checkbox"
              data-testid={`criterion-${criterion.id}`}
              checked={selectedCriteria.has(criterion.id)}
              disabled={disabled}
              onChange={() => toggleCriterion(criterion.id)}
            />
            <span>{criterion.text}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
