"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import type { ClientExercise } from "../types";

interface Props {
  exercise: ClientExercise;
  // answer is array of bank indices, one per slot (null if empty)
  answer: (number | null)[] | null;
  revealed: boolean;
  onAnswer: (slots: (number | null)[]) => void;
}

export function FillBlankExercise({ exercise, answer, revealed, onAnswer }: Props) {
  const template = exercise.template ?? "";
  const banks = exercise.banks ?? [];
  const blanks = exercise.blanks ?? 0;

  const slots = answer ?? new Array(blanks).fill(null);

  // split template into parts around {{n}}
  const parts = useMemo(() => {
    const arr: { type: "text" | "slot"; value: string | number }[] = [];
    const regex = /\{\{(\d+)\}\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(template)) !== null) {
      if (m.index > last) {
        arr.push({ type: "text", value: template.slice(last, m.index) });
      }
      arr.push({ type: "slot", value: parseInt(m[1], 10) });
      last = m.index + m[0].length;
    }
    if (last < template.length) {
      arr.push({ type: "text", value: template.slice(last) });
    }
    return arr;
  }, [template]);

  const placeChip = (bankIdx: number) => {
    if (revealed) return;
    // find first empty slot
    const nextSlot = slots.findIndex((s) => s === null);
    if (nextSlot === -1) return;
    const next = [...slots];
    next[nextSlot] = bankIdx;
    onAnswer(next);
  };

  const removeChip = (slotIdx: number) => {
    if (revealed) return;
    const next = [...slots];
    next[slotIdx] = null;
    onAnswer(next);
  };

  // which bank indices are currently used
  const usedSet = new Set(slots.filter((s) => s !== null) as number[]);

  return (
    <div>
      {/* template with inline slots */}
      <div className="rounded-2xl border border-border/60 bg-background/40 p-5">
        <p className="text-base leading-loose">
          {parts.map((part, i) => {
            if (part.type === "text") {
              return <span key={i}>{part.value}</span>;
            }
            const slotIdx = part.value as number;
            const bankIdx = slots[slotIdx];
            const chip = bankIdx !== null && bankIdx !== undefined ? banks[bankIdx] : null;
            const isCorrectSlot =
              revealed && chip && chip.correctSlot === slotIdx;
            const isWrongSlot =
              revealed && chip && chip.correctSlot !== slotIdx;

            return (
              <button
                key={i}
                onClick={() => chip !== null && removeChip(slotIdx)}
                disabled={revealed || chip === null}
                className={`mx-1 inline-flex min-w-[90px] items-center justify-center rounded-lg border-2 border-dashed px-3 py-1 align-middle text-sm font-semibold transition ${
                  chip === null
                    ? "border-primary/50 text-muted-foreground/50"
                    : isCorrectSlot
                    ? "border-neon-teal/70 bg-neon-teal/15 text-neon-teal"
                    : isWrongSlot
                    ? "border-neon-rose/70 bg-neon-rose/15 text-neon-rose"
                    : "border-primary bg-primary/15 text-primary"
                }`}
              >
                {chip ? chip.label : `____`}
              </button>
            );
          })}
        </p>
      </div>

      {/* bank of chips */}
      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          Toque para preencher
        </p>
        <div className="flex flex-wrap gap-2">
          {banks.map((bank, i) => {
            const used = usedSet.has(i);
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                disabled={used || revealed}
                onClick={() => placeChip(i)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  used
                    ? "border-border/40 bg-card/20 text-muted-foreground/40"
                    : "border-primary/60 bg-card/70 text-foreground hover:border-primary hover:bg-primary/10"
                }`}
              >
                {bank.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* correctness summary on reveal */}
      {revealed && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {slots.every((s, idx) => banks[s ?? -1]?.correctSlot === idx) ? (
            <>
              <Check className="h-4 w-4 text-neon-teal" />
              <span className="text-neon-teal">Padrão correto!</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-neon-rose" />
              <span className="text-neon-rose">
                Resposta correta:{" "}
                {Array.from({ length: blanks })
                  .map((_, idx) => {
                    const correctBank = banks.find((b) => b.correctSlot === idx);
                    return correctBank?.label ?? "?";
                  })
                  .join(" · ")}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
