import { useState } from "react";
import type { SortActivity } from "../data/generated/lessons";
import type { SortAnswer } from "../domain/evaluation";

/**
 * Ordenação por botões "mover para cima/baixo" — acessível por teclado e por
 * toque (sem drag-and-drop, que excluiria teclado e leitores de tela).
 */
export function SortView({
  activity,
  answer,
  invalidIds,
  disabled,
  onChange,
}: {
  activity: SortActivity;
  answer: SortAnswer;
  invalidIds: string[];
  disabled: boolean;
  onChange: (answer: SortAnswer) => void;
}) {
  const [moveStatus, setMoveStatus] = useState<{
    activityId: string;
    text: string;
    order: string;
  } | null>(null);
  const itemsById = new Map(activity.data.items.map((item) => [item.id, item]));
  const orderedIds =
    answer.orderedIds.length > 0 ? answer.orderedIds : activity.data.items.map((item) => item.id);

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (disabled || target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ orderedIds: next });
    const item = itemsById.get(orderedIds[index]);
    if (item)
      setMoveStatus({
        activityId: activity.id,
        text: `${item.text}: posição ${target + 1} de ${orderedIds.length}.`,
        order: JSON.stringify(next),
      });
  };

  return (
    <div className="activity">
      <div className="sr-only" data-testid="sort-move-status" aria-live="polite" aria-atomic="true">
        {moveStatus?.activityId === activity.id && moveStatus.order === JSON.stringify(orderedIds)
          ? moveStatus.text
          : ""}
      </div>
      <ol className="sort-list" aria-label="Itens para ordenar">
        {orderedIds.map((itemId, index) => {
          const item = itemsById.get(itemId);
          if (!item) return null;
          const invalid = invalidIds.includes(itemId);
          const invalidNoteId = `${activity.id}-${itemId}-invalid`;
          return (
            <li
              key={itemId}
              className={`sort-item${invalid ? " is-invalid" : ""}`}
              data-testid={`sort-item-${itemId}`}
            >
              <span className="sort-position" aria-hidden="true">
                {index + 1}.
              </span>
              <span className="sort-text">{item.text}</span>
              {invalid && (
                <span className="sort-invalid-note" id={invalidNoteId}>
                  Revise esta posição.
                </span>
              )}
              <span className="sort-actions">
                <button
                  type="button"
                  className="btn btn-small"
                  data-testid={`sort-up-${itemId}`}
                  aria-label={`Mover "${item.text}" para cima`}
                  aria-describedby={invalid ? invalidNoteId : undefined}
                  disabled={disabled}
                  aria-disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  data-testid={`sort-down-${itemId}`}
                  aria-label={`Mover "${item.text}" para baixo`}
                  aria-describedby={invalid ? invalidNoteId : undefined}
                  disabled={disabled}
                  aria-disabled={disabled || index === orderedIds.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
