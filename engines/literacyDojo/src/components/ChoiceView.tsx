import type { ChoiceActivity } from "../data/generated/lessons";
import type { ChoiceAnswer } from "../domain/evaluation";
import { toggleId } from "./toggleId";

export function ChoiceView({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: {
  activity: ChoiceActivity;
  answer: ChoiceAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: ChoiceAnswer) => void;
}) {
  const { prompt, multiSelect, options } = activity.data;
  const selected = new Set(answer.optionIds);
  const inputType = multiSelect ? "checkbox" : "radio";

  const handleChange = (optionId: string) => {
    onChange({ optionIds: multiSelect ? toggleId(answer.optionIds, optionId) : [optionId] });
  };

  return (
    <div className="activity">
      {prompt && <p className="scenario">{prompt}</p>}
      <fieldset className="fieldset">
        <legend>{multiSelect ? "Marque todas as que se aplicam." : "Escolha uma opção."}</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className={`option-card${selected.has(option.id) ? " is-selected" : ""}${
              invalidIds.includes(option.id) ? " is-invalid" : ""
            }`}
          >
            <input
              type={inputType}
              name={`choice-${activity.id}`}
              value={option.id}
              data-testid={`option-${option.id}`}
              checked={selected.has(option.id)}
              disabled={disabled}
              onChange={() => handleChange(option.id)}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
