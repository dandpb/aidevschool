"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, X, ShieldCheck } from "lucide-react";
import { useGame } from "./store";
import { useSound } from "./useSound";

export function FreezeToast() {
  const freezeNoticeActive = useGame((s) => s.freezeNoticeActive);
  const dismissed = useGame((s) => s.freezeToastDismissed);
  const set = useGame.setState;
  const play = useSound();

  const visible = freezeNoticeActive && !dismissed;

  // play sound + auto-dismiss after 8s when it becomes visible
  useEffect(() => {
    if (visible) {
      play("achievement");
      const t = setTimeout(() => {
        set({ freezeToastDismissed: true });
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [visible, play, set]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="pointer-events-auto fixed inset-x-0 top-32 z-50 mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-neon-teal/60 bg-card/95 p-4 shadow-[0_0_30px_oklch(0.78_0.14_198_/_0.5)] backdrop-blur"
        >
          {/* shimmer */}
          <span
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, oklch(0.78 0.14 198 / 0.12) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.5s linear infinite",
            }}
          />
          <button
            onClick={() => set({ freezeToastDismissed: true })}
            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background/50 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neon-teal/50 bg-background/60">
            <Snowflake className="h-5 w-5 text-neon-teal animate-flicker" />
          </div>
          <div className="relative flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-neon-teal" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neon-teal">
                Ofensiva protegida
              </span>
            </div>
            <p className="mt-0.5 text-sm font-medium leading-snug">
              Um Congelamento protegeu sua ofensiva! 🧊 Seu streak está seguro.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
