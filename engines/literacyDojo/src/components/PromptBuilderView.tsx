import type { PromptBuilderActivity } from "../data/generated/lessons";
import type { PromptBuilderAnswer } from "../domain/evaluation";

export function PromptBuilderView({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: {
  activity: PromptBuilderActivity;
  answer: PromptBuilderAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: PromptBuilderAnswer) => void;
}) {
  const { scenario, genericPrompt, fields } = activity.data;

  return (
    <div className="activity">
      <p className="scenario">{scenario}</p>
      <blockquote className="generic-prompt">
        <span className="muted">O pedido genérico de hoje:</span>
        <br />“{genericPrompt}”
      </blockquote>

      {fields.map((field) => {
        const value = answer.values[field.id] ?? "";
        const invalid = invalidIds.includes(field.id);
        return (
          <div className="field" key={field.id}>
            <label className="field-label" htmlFor={`${activity.id}-${field.id}`}>
              {field.label}
            </label>
            <p className="field-hint" id={`${activity.id}-${field.id}-hint`}>
              {field.hint}
            </p>
            <textarea
              id={`${activity.id}-${field.id}`}
              data-testid={`field-${field.id}`}
              rows={2}
              value={value}
              disabled={disabled}
              aria-describedby={`${activity.id}-${field.id}-hint`}
              aria-invalid={invalid}
              className={invalid ? "is-invalid" : undefined}
              onChange={(event) =>
                onChange({ values: { ...answer.values, [field.id]: event.target.value } })
              }
            />
          </div>
        );
      })}
    </div>
  );
}
