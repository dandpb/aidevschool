"use client";

import { motion } from "framer-motion";
import { Target, Check, Gem, ChevronRight, Sparkles } from "lucide-react";
import { useGame } from "./store";

const ACCENT_MAP: Record<string, { text: string; border: string; bg: string }> = {
  amber: {
    text: "text-neon-amber",
    border: "border-neon-amber/40",
    bg: "bg-neon-amber/10",
  },
  teal: {
    text: "text-neon-teal",
    border: "border-neon-teal/40",
    bg: "bg-neon-teal/10",
  },
  rose: {
    text: "text-neon-rose",
    border: "border-neon-rose/40",
    bg: "bg-neon-rose/10",
  },
  magenta: {
    text: "text-neon-magenta",
    border: "border-neon-magenta/40",
    bg: "bg-neon-magenta/10",
  },
};

export function DailyChallengeCard() {
  const challenge = useGame((s) => s.dailyChallenge);
  const curriculum = useGame((s) => s.curriculum);
  const startLesson = useGame((s) => s.startLesson);

  if (!challenge) return null;

  const accent = ACCENT_MAP[challenge.moduleAccent] ?? ACCENT_MAP.amber;

  // find the lesson + module in the curriculum to start it
  const handleStart = () => {
    if (!curriculum) return;
    for (const mod of curriculum) {
      const lesson = mod.lessons.find((l) => l.id === challenge.lessonId);
      if (lesson) {
        startLesson(lesson, mod);
        return;
      }
    }
  };

  const completed = challenge.completed || challenge.lessonCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`relative overflow-hidden rounded-3xl border-2 ${accent.border} ${accent.bg} p-5 backdrop-blur`}
    >
      {/* shimmer sweep for incomplete challenges */}
      {!completed && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, transparent 40%, oklch(1 0 0 / 0.06) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3.5s linear infinite",
          }}
        />
      )}

      <div className="relative flex items-center gap-4">
        {/* icon medallion */}
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${accent.border} bg-background/60 ${
            completed ? "" : "animate-float"
          }`}
          style={{ animationDuration: "4s" }}
        >
          {completed ? (
            <Check className={`h-7 w-7 ${accent.text}`} />
          ) : (
            <Target className={`h-7 w-7 ${accent.text}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <Sparkles className={`h-3 w-3 ${accent.text} animate-flicker`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${accent.text}`}>
              {completed ? "Desafio concluído" : "Desafio do dia"}
            </span>
          </div>
          <p className="truncate font-display text-base font-bold leading-tight">
            {challenge.lessonTitle}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <img
              src={challenge.moduleIcon}
              alt=""
              className="h-3.5 w-3.5 object-contain"
              draggable={false}
            />
            {challenge.moduleTitle}
            <span className="mx-1">·</span>
            <Gem className="h-3 w-3 text-neon-teal" />
            <span className="font-semibold text-neon-teal">
              +{challenge.rewardGems} 💎
            </span>
          </p>
        </div>

        {/* action */}
        {!completed && (
          <button
            onClick={handleStart}
            className={`flex shrink-0 items-center gap-1 rounded-2xl border ${accent.border} ${accent.bg} px-4 py-2.5 text-sm font-bold ${accent.text} transition hover:scale-105`}
          >
            Iniciar
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {completed && (
        <p className="relative mt-2 text-center text-xs font-medium text-muted-foreground">
          ✦ Volte amanhã para um novo desafio!
        </p>
      )}
    </motion.div>
  );
}
