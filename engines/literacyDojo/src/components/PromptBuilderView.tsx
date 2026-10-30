import type { PromptBuilderActivity } from "../data/generated/lessons";
import type { PromptBuilderAnswer } from "../domain/evaluation";
import { EVIDENCE_TEXT_MAX_LENGTH } from "../domain/evidence";

export function PromptBuilderView({
  activity,
  answer,
  invalidIds,
  disabled,
  readOnly = false,
  onChange,
}: {
  activity: PromptBuilderActivity;
  answer: PromptBuilderAnswer;
  invalidIds: string[];
  disabled: boolean;
  readOnly?: boolean;
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

      <p className="muted" id={`${activity.id}-privacy-notice`} data-testid="prompt-privacy-notice">
        Não inclua dados pessoais ou confidenciais. Ao enviar a resposta, o texto pode aparecer no
        console deste navegador e ser compartilhado com o aplicativo que abriu a missão. Ao
        concluir, uma tentativa aprovada pode ser enviada automaticamente ao verificador, se
        configurado.
      </p>

      {readOnly && (
        <p className="muted" id={`${activity.id}-answer-locked`}>
          Resposta aprovada: você pode selecionar e copiar o texto, mas não alterá-lo.
        </p>
      )}
      {fields.map((field) => {
        const value = answer.values[field.id] ?? "";
        const invalid = invalidIds.includes(field.id);
        const tooLong = value.length > EVIDENCE_TEXT_MAX_LENGTH;
        return (
          <div className="field" key={field.id}>
            <label className="field-label" htmlFor={`${activity.id}-${field.id}`}>
              {field.label}
            </label>
            <p className="field-hint" id={`${activity.id}-${field.id}-hint`}>
              {field.hint}
            </p>
            {tooLong && (
              <p className="field-hint" id={`${activity.id}-${field.id}-length`}>
                Este campo está longo demais para enviar. Reduza o texto e tente novamente.
              </p>
            )}
            <textarea
              id={`${activity.id}-${field.id}`}
              data-testid={`field-${field.id}`}
              rows={2}
              value={value}
              disabled={disabled}
              readOnly={readOnly}
              aria-describedby={`${activity.id}-${field.id}-hint ${activity.id}-privacy-notice${tooLong ? ` ${activity.id}-${field.id}-length` : ""}${readOnly ? ` ${activity.id}-answer-locked` : ""}`}
              aria-invalid={invalid || tooLong}
              className={invalid || tooLong ? "is-invalid" : undefined}
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
