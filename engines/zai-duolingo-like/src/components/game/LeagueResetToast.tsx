"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, X } from "lucide-react";
import { useGame } from "./store";
import { useSound } from "./useSound";
import { LEAGUES_INFO } from "./leagues";

interface LeagueResetInfo {
  promoted: boolean;
  demoted: boolean;
  oldLeague: string;
  newLeague: string;
}

export function LeagueResetToast() {
  const leagueResetNotice = useGame((s) => s.leagueResetNotice);
  const set = useGame.setState;
  const play = useSound();

  const visible = leagueResetNotice !== null;

  useEffect(() => {
    if (visible) {
      play("achievement");
      const t = setTimeout(() => {
        set({ leagueResetNotice: null });
      }, 9000);
      return () => clearTimeout(t);
    }
  }, [visible, play, set]);

  if (!leagueResetNotice) return null;

  const info: LeagueResetInfo = leagueResetNotice;
  const promoted = info.promoted;
  const oldInfo = LEAGUES_INFO[info.oldLeague];
  const newInfo = LEAGUES_INFO[info.newLeague];

  const accent = promoted ? "teal" : "rose";
  const color =
    accent === "teal"
      ? "border-neon-teal/60 bg-card/95 shadow-[0_0_30px_oklch(0.78_0.14_198_/_0.5)]"
      : "border-neon-rose/60 bg-card/95 shadow-[0_0_30px_oklch(0.66_0.22_18_/_0.5)]";
  const textColor = promoted ? "text-neon-teal" : "text-neon-rose";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className={`pointer-events-auto fixed inset-x-0 top-40 z-50 mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border p-4 backdrop-blur ${color}`}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background: promoted
                ? "linear-gradient(120deg, transparent 30%, oklch(0.78 0.14 198 / 0.12) 50%, transparent 70%)"
                : "linear-gradient(120deg, transparent 30%, oklch(0.66 0.22 18 / 0.12) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.5s linear infinite",
            }}
          />
          <button
            onClick={() => set({ leagueResetNotice: null })}
            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background/50 hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60">
            {promoted ? (
              <TrendingUp className={`h-5 w-5 ${textColor}`} />
            ) : (
              <TrendingDown className={`h-5 w-5 ${textColor}`} />
            )}
          </div>
          <div className="relative flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <Trophy className={`h-3 w-3 ${textColor}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>
                {promoted ? "Promoção!" : "Rebaixamento"}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-medium leading-snug">
              {promoted
                ? "Você subiu de liga esta semana!"
                : "Você caiu de liga esta semana."}
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="opacity-60">{oldInfo?.emoji} {oldInfo?.label}</span>
              <span className={textColor}>→</span>
              <span className="font-bold">{newInfo?.emoji} {newInfo?.label}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
