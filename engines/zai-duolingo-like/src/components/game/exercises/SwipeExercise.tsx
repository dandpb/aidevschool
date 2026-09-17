"use client";

import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Check, X, Sparkles, Camera } from "lucide-react";
import type { ClientExercise, SwipeItem } from "../types";

interface Props {
  exercise: ClientExercise;
  // answer is array of "ai"|"real" per item
  answer: ("ai" | "real")[] | null;
  revealed: boolean;
  onAnswer: (decisions: ("ai" | "real")[]) => void;
}

const SWIPE_THRESHOLD = 100;

export function SwipeExercise({ exercise, answer, revealed, onAnswer }: Props) {
  const items = (exercise.items ?? []).filter(
    (i): i is SwipeItem => typeof i === "object"
  );
  const [idx, setIdx] = useState(0);
  const [decisions, setDecisions] = useState<("ai" | "real")[]>(
    answer ?? []
  );
  const [exitX, setExitX] = useState(0);

  const swipeRightLabel = exercise.rightLabel ?? (exercise.swipeRightIf === "ai" ? "Feito por IA" : "Real");
  const swipeLeftLabel = exercise.leftLabel ?? (exercise.swipeRightIf === "ai" ? "Real" : "Feito por IA");

  const handleSwipe = (dir: "left" | "right") => {
    if (revealed) return;
    const decision: "ai" | "real" =
      (exercise.swipeRightIf === "ai") === (dir === "right") ? "ai" : "real";
    // simpler: right swipe → user claims "ai" if swipeRightIf==="ai" else claims "real"
    const claimed: "ai" | "real" =
      dir === "right"
        ? exercise.swipeRightIf === "ai"
          ? "ai"
          : "real"
        : exercise.swipeRightIf === "ai"
        ? "real"
        : "ai";

    const next = [...decisions, claimed];
    setDecisions(next);
    onAnswer(next);
    setExitX(dir === "right" ? 600 : -600);
    setTimeout(() => {
      setIdx((i) => i + 1);
      setExitX(0);
    }, 200);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) handleSwipe("right");
    else if (info.offset.x < -SWIPE_THRESHOLD) handleSwipe("left");
  };

  const current = items[idx];
  const allDone = idx >= items.length;

  return (
    <div className="flex flex-col items-center">
      {/* hint labels */}
      <div className="mb-3 flex w-full items-center justify-between px-2 text-xs font-semibold uppercase tracking-widest">
        <span className="flex items-center gap-1 text-neon-rose">
          <X className="h-4 w-4" /> ← {swipeLeftLabel}
        </span>
        <span className="text-muted-foreground">
          {Math.min(idx + 1, items.length)} / {items.length}
        </span>
        <span className="flex items-center gap-1 text-neon-teal">
          {swipeRightLabel} → <Check className="h-4 w-4" />
        </span>
      </div>

      {/* card stack */}
      <div className="relative h-[300px] w-full max-w-sm">
        {!allDone && current ? (
          <>
            {/* under card */}
            {items[idx + 1] && (
              <div className="absolute inset-0 scale-95 rounded-3xl border border-border/50 bg-card/40" />
            )}
            <AnimatePresence>
              <motion.div
                key={idx}
                drag={!revealed}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.6}
                onDragEnd={onDragEnd}
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ x: exitX, opacity: 0, rotate: exitX / 12 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-3xl border border-border/70 glass-panel p-5 shadow-2xl"
              >
                <div className="flex h-full flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Cartão {idx + 1}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-neon-amber" />
                      deslize para julgar
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/50">
                      <Camera className="h-6 w-6 text-neon-teal" />
                    </div>
                    <p className="font-display text-lg font-bold leading-tight">
                      {current.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {current.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-border/60 bg-card/40 text-center">
            <div>
              <Check className="mx-auto h-10 w-10 text-neon-teal" />
              <p className="mt-2 font-display text-lg font-bold">
                Todos os cartões julgados
              </p>
            </div>
          </div>
        )}
      </div>

      {/* tap buttons (fallback for desktop/no-drag) */}
      {!allDone && !revealed && (
        <div className="mt-4 flex w-full max-w-sm gap-3">
          <button
            onClick={() => handleSwipe("left")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-neon-rose/50 bg-neon-rose/10 py-3 font-semibold text-neon-rose transition hover:bg-neon-rose/20"
          >
            <X className="h-5 w-5" /> {swipeLeftLabel}
          </button>
          <button
            onClick={() => handleSwipe("right")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-neon-teal/50 bg-neon-teal/10 py-3 font-semibold text-neon-teal transition hover:bg-neon-teal/20"
          >
            {swipeRightLabel} <Check className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* reveal summary */}
      {revealed && (
        <div className="mt-4 w-full max-w-sm space-y-1.5">
          {items.map((item, i) => {
            const d = decisions[i];
            const correct = d === item.value;
            return (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                  correct
                    ? "border-neon-teal/40 bg-neon-teal/10"
                    : "border-neon-rose/40 bg-neon-rose/10"
                }`}
              >
                <span className="truncate">{item.label}</span>
                <span className="flex items-center gap-1 font-semibold">
                  {correct ? (
                    <Check className="h-3.5 w-3.5 text-neon-teal" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-neon-rose" />
                  )}
                  {item.value === "ai" ? "IA" : "Real"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
