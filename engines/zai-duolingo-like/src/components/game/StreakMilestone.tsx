"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X, Sparkles, Gem } from "lucide-react";
import { useGame } from "./store";
import { useSound } from "./useSound";
import { Bip } from "./Bip";
import { Confetti } from "./Confetti";

// Streak milestone definitions
export const STREAK_MILESTONES: Record<
  number,
  { title: string; subtitle: string; gems: number; emoji: string }
> = {
  3: {
    title: "Trinca de Dados!",
    subtitle: "3 dias compilando sem parar. A névoa recua.",
    gems: 8,
    emoji: "🔥",
  },
  7: {
    title: "Semana Perfeita!",
    subtitle: "7 dias consecutivos. Você é uma lenda da névoa.",
    gems: 20,
    emoji: "⚡",
  },
  14: {
    title: "Quinzena Quântica!",
    subtitle: "14 dias. Akihabara pisca em cores estáveis.",
    gems: 40,
    emoji: "💎",
  },
  30: {
    title: "Mês do Protocolo!",
    subtitle: "30 dias. O Vertical Protocol te saúda.",
    gems: 100,
    emoji: "👑",
  },
  50: {
    title: "Cinquenta Ciclos!",
    subtitle: "50 dias. Bip não acredita no que vê.",
    gems: 150,
    emoji: "🌟",
  },
  100: {
    title: "Centena Lendária!",
    subtitle: "100 dias. Seu nome ecoa nos servidores.",
    gems: 300,
    emoji: "🏆",
  },
};

// Returns the next milestone >= current, or null if none
export function nextMilestone(current: number): number | null {
  const thresholds = Object.keys(STREAK_MILESTONES)
    .map(Number)
    .sort((a, b) => a - b);
  for (const t of thresholds) {
    if (t > current) return t;
  }
  return null;
}

// Returns the milestone just reached if current matches one (and it wasn't
// previously celebrated). Uses localStorage to track which milestones have been
// shown.
export function checkMilestoneReached(currentStreak: number): number | null {
  if (currentStreak <= 0) return null;
  const thresholds = Object.keys(STREAK_MILESTONES)
    .map(Number)
    .sort((a, b) => a - b);
  for (const t of thresholds) {
    if (currentStreak === t) {
      // check if already celebrated
      try {
        const key = `vp-milestone-${t}`;
        if (typeof window !== "undefined" && localStorage.getItem(key)) {
          return null; // already celebrated
        }
      } catch {
        /* noop */
      }
      return t;
    }
  }
  return null;
}

function markMilestoneCelebrated(milestone: number) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(`vp-milestone-${milestone}`, "1");
    }
  } catch {
    /* noop */
  }
}

export function StreakMilestoneOverlay() {
  const streak = useGame((s) => s.snapshot?.streak);
  const snapshot = useGame((s) => s.snapshot);
  const setBipMood = useGame((s) => s.setBipMood);
  const refreshState = useGame((s) => s.refreshState);
  const refreshActivity = useGame((s) => s.refreshActivity);
  const play = useSound();
  const [milestone, setMilestone] = useState<number | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!streak || !snapshot) return;
    const reached = checkMilestoneReached(streak.current);
    if (reached !== null) {
      // defer to a microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setMilestone(reached);
        setBipMood("happy");
        play("achievement");
        markMilestoneCelebrated(reached);
      });
    }
  }, [streak?.current, snapshot, setBipMood, play]);

  const dismiss = async () => {
    // claim the reward if not yet claimed
    if (milestone !== null && !claimed) {
      try {
        const res = await fetch("/api/streak/milestone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ milestone }),
        });
        const data = await res.json();
        if (data.ok) {
          setClaimed(true);
          await refreshState();
          await refreshActivity();
        }
      } catch {
        /* noop — best effort */
      }
    }
    setMilestone(null);
    setBipMood("idle");
  };

  if (milestone === null) return null;
  const def = STREAK_MILESTONES[milestone];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
        onClick={dismiss}
      >
        <Confetti count={120} />

        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="relative mx-4 max-w-sm rounded-3xl border-2 border-neon-amber/60 bg-card/95 p-8 text-center shadow-[0_0_60px_oklch(0.84_0.17_66_/_0.5)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* dismiss button */}
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background/50 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          {/* big emoji */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 12 }}
            className="mx-auto mb-2 text-6xl"
          >
            {def.emoji}
          </motion.div>

          {/* flame ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-8 -z-10 h-24 w-24 -translate-x-1/2"
          >
            <div
              className="h-full w-full rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent, oklch(0.84 0.17 66 / 0.3), transparent, oklch(0.72 0.22 352 / 0.3), transparent)",
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-neon-amber animate-flicker">
              Marco de Ofensiva
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold neon-text-amber">
              {def.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {def.subtitle}
            </p>

            {/* streak count */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <Flame className="h-5 w-5 text-neon-amber animate-flicker" />
              <span className="font-display text-3xl font-bold tabular-nums text-neon-amber">
                {milestone}
              </span>
              <span className="text-sm text-muted-foreground">dias</span>
            </div>

            {/* reward */}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-neon-teal/40 bg-neon-teal/10 px-4 py-2">
              <Gem className="h-4 w-4 text-neon-teal" />
              <span className="text-sm font-bold text-neon-teal">
                +{def.gems} gemas bônus
              </span>
            </div>
          </motion.div>

          {/* Bip */}
          <div className="mt-4 flex justify-center">
            <Bip mood="happy" size={64} float={false} />
          </div>

          <button
            onClick={dismiss}
            className="mt-5 w-full rounded-2xl bg-primary px-6 py-3 font-display text-base font-bold text-primary-foreground shadow-[0_0_24px_oklch(0.84_0.17_66_/_0.4)] transition hover:shadow-[0_0_36px_oklch(0.84_0.17_66_/_0.6)]"
          >
            <Sparkles className="mr-1 inline h-4 w-4" />
            Continuar jornada
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
