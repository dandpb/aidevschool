"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Trophy } from "lucide-react";
import { useGame } from "./store";
import { useSound } from "./useSound";

export function AchievementToasts() {
  const toasts = useGame((s) => s.achievementToasts);
  const dismiss = useGame((s) => s.dismissAchievementToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.slug} toast={t} onDismiss={() => dismiss(t.slug)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: { slug: string; title: string; emoji: string; gemReward: number; xpReward: number };
  onDismiss: () => void;
}) {
  // auto-dismiss after 6 seconds + play reward sound on mount
  const play = useSound();
  useEffect(() => {
    play("achievement");
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss, play]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border bg-card/95 p-4 backdrop-blur border-neon-amber/60 shadow-[0_0_30px_oklch(0.84_0.17_66_/_0.5)]`}
    >
      {/* shimmer sweep */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, transparent 30%, oklch(0.84 0.17 66 / 0.12) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2.5s linear infinite",
        }}
      />
      <button
        onClick={onDismiss}
        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background/50 hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-neon-amber/50 bg-background/60 text-2xl animate-float">
          {toast.emoji}
        </div>
        <div className="flex-1 pr-4">
          <div className="mb-0.5 flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-neon-amber" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-neon-amber">
              Conquista desbloqueada!
            </span>
          </div>
          <p className="font-display text-sm font-bold leading-tight">
            {toast.title}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-0.5 text-neon-teal">
              <Sparkles className="h-3 w-3" /> +{toast.gemReward} 💎
            </span>
            <span className="text-neon-magenta">+{toast.xpReward} XP</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
