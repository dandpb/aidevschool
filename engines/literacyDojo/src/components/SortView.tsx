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
  const itemsById = new Map(activity.data.items.map((item) => [item.id, item]));
  const orderedIds =
    answer.orderedIds.length > 0 ? answer.orderedIds : activity.data.items.map((item) => item.id);

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ orderedIds: next });
  };

  return (
    <div className="activity">
      <ol className="sort-list" aria-label="Itens para ordenar">
        {orderedIds.map((itemId, index) => {
          const item = itemsById.get(itemId);
          if (!item) return null;
          return (
            <li
              key={itemId}
              className={`sort-item${invalidIds.includes(itemId) ? " is-invalid" : ""}`}
              data-testid={`sort-item-${itemId}`}
            >
              <span className="sort-position" aria-hidden="true">
                {index + 1}.
              </span>
              <span className="sort-text">{item.text}</span>
              <span className="sort-actions">
                <button
                  type="button"
                  className="btn btn-small"
                  data-testid={`sort-up-${itemId}`}
                  aria-label={`Mover "${item.text}" para cima`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  data-testid={`sort-down-${itemId}`}
                  aria-label={`Mover "${item.text}" para baixo`}
                  disabled={disabled || index === orderedIds.length - 1}
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
