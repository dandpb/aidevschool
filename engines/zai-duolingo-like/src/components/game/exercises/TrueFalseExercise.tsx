"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { ClientExercise } from "../types";

interface Props {
  exercise: ClientExercise;
  answer: boolean | null;
  revealed: boolean;
  onAnswer: (val: boolean) => void;
}

export function TrueFalseExercise({ exercise, answer, revealed, onAnswer }: Props) {
  const correct = exercise.isTrue ?? false;

  const options: { label: string; value: boolean }[] = [
    { label: "Verdadeiro", value: true },
    { label: "Falso", value: false },
  ];

  return (
    <div>
      <div className="mb-4 rounded-2xl border border-border/60 bg-background/40 p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          A IA afirma:
        </p>
        <p className="mt-1.5 text-base font-medium leading-relaxed">
          &ldquo;{exercise.statement}&rdquo;
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = answer === opt.value;
          const isCorrect = opt.value === correct;
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isSelected && !isCorrect;

          return (
            <motion.button
              key={opt.label}
              whileTap={{ scale: 0.97 }}
              disabled={revealed}
              onClick={() => onAnswer(opt.value)}
              className={`flex flex-col items-center gap-2 rounded-2xl border py-5 font-display text-lg font-bold transition ${
                showCorrect
                  ? "border-neon-teal/70 bg-neon-teal/15 text-neon-teal"
                  : showWrong
                  ? "border-neon-rose/70 bg-neon-rose/15 text-neon-rose animate-shake"
                  : isSelected
                  ? "border-primary/70 bg-primary/10 text-primary"
                  : "border-border bg-card/50 hover:border-primary/50"
              }`}
            >
              {opt.value ? (
                <Check className="h-7 w-7" />
              ) : (
                <X className="h-7 w-7" />
              )}
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
