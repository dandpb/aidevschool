"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useGame } from "./store";
import { LEAGUES_INFO, LEAGUE_ORDER } from "./leagues";

export function Leaderboard() {
  const leaderboard = useGame((s) => s.leaderboard);
  const refreshLeaderboard = useGame((s) => s.refreshLeaderboard);
  const setView = useGame((s) => s.setView);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  const sorted = useMemo(
    () => [...(leaderboard?.standings ?? [])].sort((a, b) => a.rank - b.rank),
    [leaderboard]
  );

  if (!leaderboard) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">
        Carregando liga...
      </div>
    );
  }

  const myStanding = sorted.find((s) => s.isMe);
  const total = leaderboard.total;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        onClick={() => setView("home")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      {/* header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full border border-neon-magenta/40 bg-card/60 shadow-[0_0_24px_oklch(0.72_0.22_352_/_0.35)]">
          <Trophy className="h-8 w-8 text-neon-magenta" />
        </div>
        <h1 className="font-display text-2xl font-bold neon-text-magenta">
          Liga {leaderboard.leagueMeta.label}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {leaderboard.leagueMeta.emoji} Top {leaderboard.promoteZone} sobem ·
          Últimos {leaderboard.demoteZone} caem
        </p>
      </div>

      {/* my rank summary */}
      {myStanding && (
        <div className="mb-4 rounded-2xl border border-neon-amber/40 bg-neon-amber/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Sua posição
              </p>
              <p className="font-display text-2xl font-bold">
                #{myStanding.rank}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  de {total}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-bold text-neon-amber">
                {myStanding.leagueXp} XP
              </p>
              <p className="text-xs text-muted-foreground">esta semana</p>
            </div>
          </div>

          {/* promotion / demotion preview */}
          <PromotionPreview
            myRank={myStanding.rank}
            myXp={myStanding.leagueXp}
            standings={sorted}
            promoteZone={leaderboard.promoteZone}
            demoteZone={leaderboard.demoteZone}
            total={total}
          />
        </div>
      )}

      {/* standings */}
      <div className="space-y-2">
        {sorted.map((s, i) => {
          const isPromote = i < leaderboard.promoteZone;
          const isDemote = i >= total - leaderboard.demoteZone;
          const trend = isPromote ? "up" : isDemote ? "down" : "hold";
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                s.isMe
                  ? "border-neon-amber/60 bg-neon-amber/10 shadow-[0_0_18px_oklch(0.84_0.17_66_/_0.2)]"
                  : "border-border/60 bg-card/50"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                  s.rank === 1
                    ? "bg-neon-amber/20 text-neon-amber"
                    : s.rank === 2
                    ? "bg-zinc-400/20 text-zinc-300"
                    : s.rank === 3
                    ? "bg-neon-rose/20 text-neon-rose"
                    : "bg-background/50 text-muted-foreground"
                }`}
              >
                {s.rank}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {s.name}
                  {s.isRival && (
                    <span className="ml-1.5 rounded-full bg-background/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      npc
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {trend === "up" && <TrendingUp className="h-4 w-4 text-neon-teal" />}
                {trend === "down" && <TrendingDown className="h-4 w-4 text-neon-rose" />}
                {trend === "hold" && <Minus className="h-4 w-4 text-muted-foreground/50" />}
                <span className="font-display text-sm font-bold tabular-nums">
                  {s.leagueXp} XP
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* league ladder */}
      <div className="mt-8">
        <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Escada das ligas
        </h3>
        <div className="flex items-center justify-center gap-1 overflow-x-auto cozy-scroll pb-2">
          {LEAGUE_ORDER.map((lkey, i) => {
            const l = LEAGUES_INFO[lkey];
            const active = leaderboard.league === lkey;
            return (
              <div key={lkey} className="flex items-center gap-1">
                <div
                  className={`flex flex-col items-center rounded-xl border px-3 py-2 ${
                    active
                      ? "border-neon-magenta/60 bg-neon-magenta/10"
                      : "border-border/50 bg-card/30"
                  }`}
                >
                  <span className="text-lg">{l.emoji}</span>
                  <span className="text-[10px] font-semibold">{l.label}</span>
                </div>
                {i < LEAGUE_ORDER.length - 1 && (
                  <span className="text-muted-foreground/50">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PromotionPreview({
  myRank,
  myXp,
  standings,
  promoteZone,
  demoteZone,
  total,
}: {
  myRank: number;
  myXp: number;
  standings: { rank: number; leagueXp: number; name: string }[];
  promoteZone: number;
  demoteZone: number;
  total: number;
}) {
  // in promotion zone?
  const inPromoteZone = myRank <= promoteZone;
  // in demotion zone?
  const inDemoteZone = myRank > total - demoteZone;

  let target: { label: string; xpNeeded: number; direction: "up" | "down" | "safe" } | null = null;

  if (inPromoteZone) {
    target = { label: "Zona de promoção", xpNeeded: 0, direction: "up" };
  } else if (inDemoteZone) {
    // how much XP to escape demotion (reach rank = total - demoteZone)
    const safetyRank = total - demoteZone;
    const safetyStanding = standings.find((s) => s.rank === safetyRank);
    const safetyXp = safetyStanding?.leagueXp ?? 0;
    target = {
      label: "Zona de rebaixamento",
      xpNeeded: Math.max(0, safetyXp - myXp + 1),
      direction: "down",
    };
  } else {
    // how much XP to reach promotion zone (rank = promoteZone)
    const promoteStanding = standings.find((s) => s.rank === promoteZone);
    const promoteXp = promoteStanding?.leagueXp ?? 0;
    target = {
      label: "Para promoção",
      xpNeeded: Math.max(0, promoteXp - myXp + 1),
      direction: "up",
    };
  }

  if (!target) return null;

  const color =
    target.direction === "up"
      ? "border-neon-teal/40 bg-neon-teal/5 text-neon-teal"
      : target.direction === "down"
      ? "border-neon-rose/40 bg-neon-rose/5 text-neon-rose"
      : "border-border/40 bg-card/30 text-muted-foreground";

  const icon = target.direction === "up" ? "↑" : target.direction === "down" ? "↓" : "•";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={`mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${color}`}
    >
      <span className="text-lg font-bold">{icon}</span>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide">{target.label}</p>
        {target.xpNeeded > 0 ? (
          <p className="text-sm">
            Faltam <strong>{target.xpNeeded} XP</strong>{" "}
            {target.direction === "up" ? "para subir" : "para escapar"}
          </p>
        ) : target.direction === "up" ? (
          <p className="text-sm">Você está na zona de promoção! ✦</p>
        ) : (
          <p className="text-sm">Seguro por enquanto.</p>
        )}
      </div>
    </motion.div>
  );
}
