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
  const invalidCriteria = new Set(invalidIds);
  if (invalidIds.includes("noExtraCriteria")) {
    const required = new Set(activity.evaluation.requiredCriterionIds);
    for (const id of selectedCriteria) {
      if (!required.has(id)) invalidCriteria.add(id);
    }
  }
  const groupName = `output-${activity.id}`;

  const toggleCriterion = (criterionId: string) => {
    onChange({ ...answer, criterionIds: toggleId(answer.criterionIds, criterionId) });
  };

  return (
    <div className="activity">
      {scenario && <p className="scenario">{scenario}</p>}

      <fieldset className="fieldset" aria-describedby={`${activity.id}-outputs-legend`}>
        <legend id={`${activity.id}-outputs-legend`}>
          Escolha uma opção conforme a instrução da atividade
        </legend>
        {outputs.map((output, index) => (
          <label
            key={output.id}
            className={`option-card${answer.outputId === output.id ? " is-selected" : ""}${
              invalidIds.includes("betterOutputId") && answer.outputId === output.id
                ? " is-invalid"
                : ""
            }`}
          >
            <input
              type="radio"
              name={groupName}
              value={output.id}
              data-testid={`output-${output.id}`}
              checked={answer.outputId === output.id}
              aria-invalid={
                (invalidIds.includes("betterOutputId") && answer.outputId === output.id) ||
                undefined
              }
              disabled={disabled}
              onChange={() => onChange({ ...answer, outputId: output.id })}
            />
            <span>
              <strong>Opção {String.fromCharCode(65 + index)}</strong>
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
              invalidCriteria.has(criterion.id) ? " is-invalid" : ""
            }`}
          >
            <input
              type="checkbox"
              data-testid={`criterion-${criterion.id}`}
              checked={selectedCriteria.has(criterion.id)}
              aria-invalid={invalidCriteria.has(criterion.id) || undefined}
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
