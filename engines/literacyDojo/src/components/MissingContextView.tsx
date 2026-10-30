import type { MissingContextActivity } from "../data/generated/lessons";
import type { MissingContextAnswer } from "../domain/evaluation";
import { toggleId } from "./toggleId";

export function MissingContextView({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: {
  activity: MissingContextActivity;
  answer: MissingContextAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: MissingContextAnswer) => void;
}) {
  const { prompt, contextOptions } = activity.data;
  const selected = new Set(answer.contextIds);
  const invalidContext = new Set(invalidIds);
  if (invalidIds.includes("noExtraContext")) {
    const required = new Set(activity.evaluation.requiredContextIds);
    for (const id of selected) {
      if (!required.has(id)) invalidContext.add(id);
    }
  }

  const toggle = (contextId: string) => {
    onChange({ contextIds: toggleId(answer.contextIds, contextId) });
  };

  return (
    <div className="activity">
      <blockquote className="generic-prompt">
        <span className="muted">O pedido foi:</span>
        <br />“{prompt}”
      </blockquote>
      <fieldset className="fieldset">
        <legend>O que estava faltando nesse pedido? Marque tudo que se aplica.</legend>
        {contextOptions.map((option) => (
          <label
            key={option.id}
            className={`option-card option-inline${selected.has(option.id) ? " is-selected" : ""}${
              invalidContext.has(option.id) ? " is-invalid" : ""
            }`}
          >
            <input
              type="checkbox"
              data-testid={`context-${option.id}`}
              checked={selected.has(option.id)}
              aria-invalid={invalidContext.has(option.id) || undefined}
              disabled={disabled}
              onChange={() => toggle(option.id)}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
