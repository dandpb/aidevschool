import type { SafetyClassificationActivity } from "../data/generated/lessons";
import type { SafetyClassificationAnswer } from "../domain/evaluation";

export function SafetyClassificationView({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: {
  activity: SafetyClassificationActivity;
  answer: SafetyClassificationAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: SafetyClassificationAnswer) => void;
}) {
  const { labels, items } = activity.data;

  const choose = (itemId: string, value: "safe" | "sensitive") => {
    onChange({ labels: { ...answer.labels, [itemId]: value } });
  };

  return (
    <div className="activity">
      <ul className="classify-list">
        {items.map((item) => {
          const value = answer.labels[item.id];
          const invalid = invalidIds.includes(item.id);
          return (
            <li
              key={item.id}
              className={`classify-item${invalid ? " is-invalid" : ""}`}
              data-testid={`item-${item.id}`}
            >
              <p className="classify-text">{item.text}</p>
              <div className="segmented" role="radiogroup" aria-label={item.text}>
                <label className={`segment segment-safe${value === "safe" ? " is-selected" : ""}`}>
                  <input
                    type="radio"
                    name={`classify-${item.id}`}
                    data-testid={`item-${item.id}-safe`}
                    checked={value === "safe"}
                    aria-invalid={(invalid && value === "safe") || undefined}
                    aria-describedby={
                      invalid && value === "safe" ? `${activity.id}-${item.id}-invalid` : undefined
                    }
                    disabled={disabled}
                    onChange={() => choose(item.id, "safe")}
                  />
                  {labels.safe}
                </label>
                <label
                  className={`segment segment-sensitive${value === "sensitive" ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={`classify-${item.id}`}
                    data-testid={`item-${item.id}-sensitive`}
                    checked={value === "sensitive"}
                    aria-invalid={(invalid && value === "sensitive") || undefined}
                    aria-describedby={
                      invalid && value === "sensitive"
                        ? `${activity.id}-${item.id}-invalid`
                        : undefined
                    }
                    disabled={disabled}
                    onChange={() => choose(item.id, "sensitive")}
                  />
                  {labels.sensitive}
                </label>
              </div>
              {invalid && (
                <p className="activity-invalid-note" id={`${activity.id}-${item.id}-invalid`}>
                  Revise esta resposta.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
