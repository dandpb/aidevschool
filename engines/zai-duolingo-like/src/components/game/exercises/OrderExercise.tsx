"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Check, X } from "lucide-react";
import type { ClientExercise } from "../types";

interface Props {
  exercise: ClientExercise;
  // answer is array of original item indices in the user's current order
  answer: number[] | null;
  revealed: boolean;
  onAnswer: (order: number[]) => void;
}

interface SortableItem {
  id: string;
  originalIdx: number;
  text: string;
}

function shuffleDistinct(n: number): number[] {
  // produce a permutation of [0..n-1] that is not the identity
  let perm = Array.from({ length: n }, (_, i) => i);
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    if (perm.some((v, i) => v !== i)) break;
  }
  return perm;
}

export function OrderExercise({ exercise, answer, revealed, onAnswer }: Props) {
  const items = (exercise.items ?? []).filter(
    (i): i is string => typeof i === "string"
  );
  const correctOrder = exercise.correctOrder ?? items.map((_, i) => i);

  // initial scramble (stable per mount — component remounts via key on exercise change)
  const [order, setOrder] = useState<SortableItem[]>(() => {
    if (answer && answer.length === items.length) {
      // restore from existing answer
      return answer.map((origIdx) => ({
        id: `item-${origIdx}`,
        originalIdx: origIdx,
        text: items[origIdx],
      }));
    }
    const perm = shuffleDistinct(items.length);
    return perm.map((origIdx) => ({
      id: `item-${origIdx}`,
      originalIdx: origIdx,
      text: items[origIdx],
    }));
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // emit the initial scramble as the answer on mount so the learner can verify
  // even without rearranging
  useEffect(() => {
    onAnswer(order.map((i) => i.originalIdx));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      onAnswer(next.map((i) => i.originalIdx));
      return next;
    });
  };

  const emit = (next: SortableItem[]) => {
    setOrder(next);
    onAnswer(next.map((i) => i.originalIdx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    emit(arrayMove(order, idx, target));
  };

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">
        Arraste para ordenar · ou use as setas
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={order.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {order.map((item, i) => (
              <SortableRow
                key={item.id}
                item={item}
                position={i}
                total={order.length}
                revealed={revealed}
                correct={
                  revealed
                    ? correctOrder[i] === item.originalIdx
                    : null
                }
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                disabled={revealed}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {revealed && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {order.every((it, i) => correctOrder[i] === it.originalIdx) ? (
            <>
              <Check className="h-4 w-4 text-neon-teal" />
              <span className="text-neon-teal">Sequência perfeita!</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-neon-rose" />
              <span className="text-neon-rose">
                Ordem correta:{" "}
                {correctOrder
                  .map((origIdx) => items[origIdx])
                  .join(" → ")}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SortableRow({
  item,
  position,
  total,
  revealed,
  correct,
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  item: SortableItem;
  position: number;
  total: number;
  revealed: boolean;
  correct: boolean | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 ${
        correct === true
          ? "border-neon-teal/60 bg-neon-teal/10"
          : correct === false
          ? "border-neon-rose/60 bg-neon-rose/10"
          : isDragging
          ? "border-primary/70 bg-card/90 shadow-lg"
          : "border-border bg-card/60"
      }`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-xs font-bold text-muted-foreground">
        {position + 1}
      </span>
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed"
        aria-label="Arrastar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex-1 text-sm font-medium leading-snug">{item.text}</span>
      {!disabled && (
        <div className="flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={position === 0}
            className="text-muted-foreground transition hover:text-primary disabled:opacity-30"
            aria-label="Mover para cima"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={position === total - 1}
            className="text-muted-foreground transition hover:text-primary disabled:opacity-30"
            aria-label="Mover para baixo"
          >
            ▼
          </button>
        </div>
      )}
      {revealed && (
        <span className="ml-1">
          {correct ? (
            <Check className="h-4 w-4 text-neon-teal" />
          ) : (
            <X className="h-4 w-4 text-neon-rose" />
          )}
        </span>
      )}
    </div>
  );
}
