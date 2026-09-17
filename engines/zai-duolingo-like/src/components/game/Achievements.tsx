"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Trophy, Lock, Sparkles, ChevronDown } from "lucide-react";
import { useGame } from "./store";
import type { AchievementClient } from "./types";

const ACCENT_RING: Record<string, string> = {
  amber: "border-neon-amber/50 shadow-[0_0_22px_oklch(0.84_0.17_66_/_0.3)]",
  teal: "border-neon-teal/50 shadow-[0_0_22px_oklch(0.78_0.14_198_/_0.3)]",
  magenta: "border-neon-magenta/50 shadow-[0_0_22px_oklch(0.72_0.22_352_/_0.3)]",
  rose: "border-neon-rose/50 shadow-[0_0_22px_oklch(0.66_0.22_18_/_0.3)]",
  violet: "border-neon-violet/50 shadow-[0_0_22px_oklch(0.7_0.18_320_/_0.3)]",
};
const ACCENT_TEXT: Record<string, string> = {
  amber: "neon-text-amber",
  teal: "neon-text-teal",
  magenta: "neon-text-magenta",
  rose: "neon-text-rose",
  violet: "text-neon-violet",
};

const CATEGORY_LABEL: Record<string, string> = {
  inicio: "Início da jornada",
  trilha: "Trilha do conhecimento",
  ofensiva: "Ofensivas",
  mestre: "Maestria",
  explorador: "Explorador",
};
const CATEGORY_ORDER = ["inicio", "trilha", "ofensiva", "explorador", "mestre"];

export function Achievements() {
  const achievements = useGame((s) => s.achievements);
  const refreshAchievements = useGame((s) => s.refreshAchievements);
  const setView = useGame((s) => s.setView);

  useEffect(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  if (!achievements) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Carregando conquistas...
      </div>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalGems = achievements
    .filter((a) => a.unlocked)
    .reduce((acc, a) => acc + a.gemReward, 0);

  // group by category
  const byCat = new Map<string, AchievementClient[]>();
  for (const a of achievements) {
    const list = byCat.get(a.category) ?? [];
    list.push(a);
    byCat.set(a.category, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button
        onClick={() => setView("home")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      {/* header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full border border-neon-amber/40 bg-card/60 shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.35)]">
          <Trophy className="h-8 w-8 text-neon-amber" />
        </div>
        <h1 className="font-display text-2xl font-bold neon-text-amber">
          Conquistas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {unlockedCount} de {achievements.length} selos desbloqueados ·{" "}
          {totalGems} 💎 acumulados
        </p>
      </div>

      {/* progress bar */}
      <div className="mb-6 rounded-2xl border border-border/60 bg-card/40 p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-widest text-muted-foreground">
            Coleção
          </span>
          <span className="font-bold text-neon-amber">
            {Math.round((unlockedCount / achievements.length) * 100)}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-background/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${(unlockedCount / achievements.length) * 100}%`,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background:
                "linear-gradient(90deg, var(--neon-amber), var(--neon-magenta))",
            }}
          >
            {/* shimmer */}
            <span
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.25), transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmer 2.4s linear infinite",
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* categories */}
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const list = byCat.get(cat);
          if (!list || list.length === 0) return null;
          return (
            <CollapsibleCategory key={cat} cat={cat} list={list} />
          );
        })}
      </div>
    </div>
  );
}

function CollapsibleCategory({
  cat,
  list,
}: {
  cat: string;
  list: AchievementClient[];
}) {
  const [open, setOpen] = useState(true);
  const unlockedInCat = list.filter((a) => a.unlocked).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/50 bg-card/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-card/50"
      >
        <h2 className="flex-1 font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {CATEGORY_LABEL[cat]}
        </h2>
        <span className="rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
          {unlockedInCat}/{list.length}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 p-4 pt-2 sm:grid-cols-3">
              {list.map((a, i) => (
                <BadgeCard key={a.slug} achievement={a} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function BadgeCard({
  achievement,
  index,
}: {
  achievement: AchievementClient;
  index: number;
}) {
  const ring = ACCENT_RING[achievement.accent];
  const text = ACCENT_TEXT[achievement.accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200, damping: 16 }}
      className={`relative flex flex-col items-center rounded-2xl border p-4 text-center transition ${
        achievement.unlocked
          ? `bg-card/70 ${ring}`
          : "border-border/40 bg-card/20 opacity-70"
      }`}
    >
      {/* emoji medallion */}
      <div
        className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 text-2xl ${
          achievement.unlocked
            ? "border-border/60 bg-background/60"
            : "border-border/40 bg-background/30 grayscale"
        } ${achievement.unlocked ? "animate-float" : ""}`}
        style={achievement.unlocked ? { animationDuration: "5s" } : undefined}
      >
        {achievement.unlocked ? (
          <span>{achievement.emoji}</span>
        ) : (
          <Lock className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <p
        className={`text-sm font-bold leading-tight ${
          achievement.unlocked ? text : "text-muted-foreground"
        }`}
      >
        {achievement.unlocked ? achievement.title : "???"}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
        {achievement.description}
      </p>

      {achievement.unlocked && (
        <div className="mt-2 flex items-center gap-1 rounded-full bg-background/50 px-2 py-0.5 text-[10px] font-semibold">
          <Sparkles className="h-3 w-3 text-neon-magenta" />
          +{achievement.gemReward}💎 · +{achievement.xpReward} XP
        </div>
      )}
    </motion.div>
  );
}
