"use client";

import { motion } from "framer-motion";
import {
  Flame,
  Heart,
  Trophy,
  Map,
  PlayCircle,
  Sparkles,
  AlertTriangle,
  RotateCw,
  Award,
  MessageSquare,
  ShoppingBag,
  Snowflake,
} from "lucide-react";
import { useGame } from "./store";
import type { ClientLesson, ClientModule } from "./types";
import { Bip } from "./Bip";
import { WeatherWidget } from "./WeatherWidget";
import { LEAGUES_INFO } from "./leagues";
import { ExpandableText } from "./ExpandableText";
import { DailyChallengeCard } from "./DailyChallengeCard";

export function Home() {
  const snapshot = useGame((s) => s.snapshot);
  const streak = useGame((s) => s.snapshot?.streak);
  const progress = useGame((s) => s.snapshot?.progress);
  const curriculum = useGame((s) => s.curriculum);
  const setView = useGame((s) => s.setView);
  const startLesson = useGame((s) => s.startLesson);
  const refillHearts = useGame((s) => s.refillHearts);

  if (!snapshot) return null;
  const learner = snapshot.learner;
  const hearts = snapshot.hearts;

  // find current (next incomplete unlocked) lesson
  let currentLesson: { lesson: ClientLesson; module: ClientModule } | null = null;
  let dailyTip: string | null = null;
  if (curriculum) {
    for (const mod of curriculum) {
      if (dailyTip === null && mod.lessons[0]) dailyTip = mod.lessons[0].tip;
      for (const lesson of mod.lessons) {
        if (lesson.unlocked && !lesson.completed) {
          currentLesson = { lesson, module: mod };
          dailyTip = lesson.tip;
          break;
        }
      }
      if (currentLesson) break;
    }
    // if all complete, show last lesson tip
    if (!currentLesson && !dailyTip) {
      const firstMod = curriculum[0];
      dailyTip = firstMod?.lessons[0]?.tip ?? null;
    }
  }

  const allDone = progress?.completedLessons === progress?.totalLessons && (progress?.totalLessons ?? 0) > 0;
  const weeklyPct = Math.min(
    100,
    Math.round(((streak?.weeklyXp ?? 0) / (streak?.weeklyGoal ?? 1)) * 100)
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 6
      ? "Madrugada úmida"
      : hour < 12
      ? "Bom dia, Compilador"
      : hour < 18
      ? "Boa tarde"
      : "Boa noite";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* hero greeting */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 glass-panel p-6 sm:p-8"
      >
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Bip mood={allDone ? "happy" : streak?.missedDay ? "sad" : "idle"} size={130} />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-neon-teal">
              {greeting}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              {learner.name}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {allDone
                ? "Você dominou todos os padrões. A cidade está salva. ✦"
                : currentLesson
                ? `Próxima lição: ${currentLesson.lesson.title}`
                : "Carregando a trilha..."}
            </p>

            {/* streak banner */}
            {streak?.missedDay && !allDone && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-neon-rose/40 bg-neon-rose/10 px-3 py-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-neon-rose" />
                <span>
                  Sua ofensiva quebrou ontem. Que tal recomeçar hoje? Bip sentiu
                  sua falta.
                </span>
              </div>
            )}
            {streak && !streak.missedDay && streak.current > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-neon-amber/40 bg-neon-amber/10 px-3 py-2 text-sm">
                  <Flame className="h-4 w-4 text-neon-amber" />
                  <span>
                    Ofensiva de <strong>{streak.current}</strong> dia
                    {streak.current !== 1 ? "s" : ""}. Continue compilando!
                  </span>
                </div>
                {streak.freezes > 0 && (
                  <div
                    className="flex items-center gap-1.5 rounded-xl border border-neon-teal/40 bg-neon-teal/10 px-3 py-2 text-xs font-semibold text-neon-teal"
                    title="Congelamentos de ofensiva disponíveis"
                  >
                    <Snowflake className="h-3.5 w-3.5" />
                    {streak.freezes}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* primary CTA */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {currentLesson ? (
            <button
              onClick={() => startLesson(currentLesson!.lesson, currentLesson!.module)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-display text-lg font-bold text-primary-foreground shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.4)] transition hover:shadow-[0_0_44px_oklch(0.84_0.17_66_/_0.65)] animate-cta-pulse"
            >
              <PlayCircle className="h-6 w-6" />
              {(progress?.completedLessons ?? 0) === 0 ? "Começar lição 1" : "Continuar"}
            </button>
          ) : (
            <button
              onClick={() => setView("path")}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-display text-lg font-bold text-primary-foreground shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.4)] transition hover:shadow-[0_0_44px_oklch(0.84_0.17_66_/_0.65)]"
            >
              <Map className="h-6 w-6" />
              Revisar trilha
            </button>
          )}
          <button
            onClick={() => setView("path")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-6 py-4 font-semibold transition hover:border-primary/60"
          >
            <Map className="h-5 w-5 text-neon-teal" />
            Trilha
          </button>
          <button
            onClick={() => setView("playground")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-neon-teal/40 bg-neon-teal/10 px-6 py-4 font-semibold text-neon-teal transition hover:bg-neon-teal/20"
          >
            <MessageSquare className="h-5 w-5" />
            Playground
          </button>
        </div>
      </motion.section>

      {/* daily challenge */}
      <DailyChallengeCard />

      {/* stats row */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Flame className="h-5 w-5 text-neon-amber" />}
          label="Ofensiva"
          value={`${streak?.current ?? 0}`}
          sub={`recorde ${streak?.longest ?? 0}`}
        />
        <StatCard
          icon={<Heart className="h-5 w-5 text-neon-rose" fill="currentColor" />}
          label="Vidas"
          value={`${hearts.current}/${hearts.max}`}
          sub={
            hearts.current < hearts.max ? (
              <button
                onClick={() => refillHearts()}
                className="text-neon-teal underline-offset-2 hover:underline"
              >
                recuperar (5💎)
              </button>
            ) : (
              "cheio"
            )
          }
        />
        <StatCard
          icon={<Sparkles className="h-5 w-5 text-neon-magenta" />}
          label="XP total"
          value={`${learner.xp}`}
          sub={`liga ${LEAGUES_INFO[learner.league]?.label ?? "Bronze"} ${LEAGUES_INFO[learner.league]?.emoji ?? ""}`}
        />
        <StatCard
          icon={<Map className="h-5 w-5 text-neon-teal" />}
          label="Progresso"
          value={`${progress?.completedLessons ?? 0}/${progress?.totalLessons ?? 0}`}
          sub="lições"
        />
      </div>

      {/* weekly goal + weather */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Meta semanal
            </h3>
            <span
              className={`text-sm font-bold ${
                weeklyPct >= 100 ? "text-neon-teal" : "text-neon-amber"
              }`}
            >
              {streak?.weeklyXp ?? 0} / {streak?.weeklyGoal ?? 50} XP
              {weeklyPct >= 100 && " ✦"}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-background/60">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weeklyPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative h-full overflow-hidden rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, var(--neon-amber), var(--neon-magenta), var(--neon-teal))",
              }}
            >
              <span
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.3), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2.6s linear infinite",
                }}
              />
            </motion.div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {weeklyPct >= 100
              ? "Meta atingida! Você é uma lenda da névoa. ✦"
              : `Faltam ${Math.max(
                  0,
                  (streak?.weeklyGoal ?? 50) - (streak?.weeklyXp ?? 0)
                )} XP para a meta semanal.`}
          </p>

          {/* league progress */}
          <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">
                {LEAGUES_INFO[learner.league]?.emoji} Liga{" "}
                {LEAGUES_INFO[learner.league]?.label}
              </span>
              {learner.nextLeagueThreshold !== null && (
                <span className="text-muted-foreground">
                  {learner.xp} / {learner.nextLeagueThreshold} XP p/ subir
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${
                    learner.nextLeagueThreshold !== null
                      ? Math.min(
                          100,
                          (learner.xp /
                            (learner.nextLeagueThreshold -
                              (LEAGUES_INFO[learner.league]?.threshold ?? 0))) *
                            100
                        )
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        <WeatherWidget variant="full" />
      </div>

      {/* daily pílula */}
      {dailyTip && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 overflow-hidden rounded-3xl border border-neon-teal/30 bg-card/50 p-5 backdrop-blur sm:p-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <RotateCw className="h-4 w-4 text-neon-teal animate-flicker" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-neon-teal">
              Pílula do dia
            </h3>
          </div>
          <ExpandableText text={dailyTip} collapsedLines={3} />
        </motion.div>
      )}

      {/* achievements + playground + shop row */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => setView("achievements")}
          className="group relative overflow-hidden rounded-3xl border border-neon-amber/30 bg-card/50 p-5 text-left backdrop-blur transition hover:border-neon-amber/60"
        >
          <div className="mb-2 flex items-center gap-2">
            <Award className="h-4 w-4 text-neon-amber" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-neon-amber">
              Conquistas
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Colete selos pela sua jornada — cada um rende gemas e XP.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-2xl">
            <span>🌱</span>
            <span>⭐</span>
            <span>🔥</span>
            <span>👑</span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-neon-amber">
            Ver coleção →
          </span>
        </button>

        <button
          onClick={() => setView("playground")}
          className="group relative overflow-hidden rounded-3xl border border-neon-teal/30 bg-card/50 p-5 text-left backdrop-blur transition hover:border-neon-teal/60"
        >
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-neon-teal" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-neon-teal">
              Playground de IA
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Converse com o Bip e pratique prompts sem sair do jogo.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <img
              src="/art/bip-thinking.png"
              alt=""
              className="h-10 w-10 object-contain animate-float"
              draggable={false}
            />
            <span className="rounded-xl border border-border/60 bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
              "Aja como um professor..."
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-neon-teal">
            Abrir playground →
          </span>
        </button>

        <button
          onClick={() => setView("shop")}
          className="group relative overflow-hidden rounded-3xl border border-neon-rose/30 bg-card/50 p-5 text-left backdrop-blur transition hover:border-neon-rose/60"
        >
          <div className="mb-2 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-neon-rose" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-neon-rose">
              Loja de Gemas
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Troque gemas por vidas e congelamentos de ofensiva.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-2xl">
            <span>❤️</span>
            <span>🧊</span>
            <span className="ml-auto flex items-center gap-0.5 text-sm font-bold text-neon-teal">
              {learner.gems} 💎
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-neon-rose">
            Visitar loja →
          </span>
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
