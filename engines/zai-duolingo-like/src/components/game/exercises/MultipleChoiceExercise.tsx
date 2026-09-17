"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { ClientExercise } from "../types";

interface Props {
  exercise: ClientExercise;
  answer: number | null;
  revealed: boolean;
  onAnswer: (idx: number) => void;
}

export function MultipleChoiceExercise({ exercise, answer, revealed, onAnswer }: Props) {
  const options = exercise.options ?? [];
  const correct = exercise.correctIndex ?? -1;

  return (
    <div className="space-y-2.5">
      {options.map((opt, i) => {
        const isSelected = answer === i;
        const isCorrect = i === correct;
        const showCorrect = revealed && isCorrect;
        const showWrong = revealed && isSelected && !isCorrect;

        return (
          <motion.button
            key={i}
            whileTap={{ scale: 0.98 }}
            disabled={revealed}
            onClick={() => onAnswer(i)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
              showCorrect
                ? "border-neon-teal/70 bg-neon-teal/15"
                : showWrong
                ? "border-neon-rose/70 bg-neon-rose/15 animate-shake"
                : isSelected
                ? "border-primary/70 bg-primary/10"
                : "border-border bg-card/50 hover:border-primary/50 hover:bg-card/80"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                showCorrect
                  ? "border-neon-teal/70 text-neon-teal"
                  : showWrong
                  ? "border-neon-rose/70 text-neon-rose"
                  : isSelected
                  ? "border-primary/70 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {showCorrect ? (
                <Check className="h-4 w-4" />
              ) : showWrong ? (
                <X className="h-4 w-4" />
              ) : (
                String.fromCharCode(65 + i)
              )}
            </span>
            <span className="text-sm font-medium leading-snug">{opt}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
