"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Heart,
  Gem,
  Zap,
  Flame,
  Trophy,
  Volume2,
  VolumeX,
  CloudRain,
  Sparkles,
  RotateCcw,
  RotateCw,
  AlertTriangle,
  History,
  Target,
  MessageSquare,
  Award,
  TrendingUp,
} from "lucide-react";
import { useGame } from "./store";
import { Bip } from "./Bip";
import { LEAGUES_INFO, LEAGUE_ORDER } from "./leagues";
import { ActivityFeed } from "./ActivityFeed";
import { ProgressRing } from "./ProgressRing";

export function Profile() {
  const snapshot = useGame((s) => s.snapshot);
  const streak = useGame((s) => s.snapshot?.streak);
  const progress = useGame((s) => s.snapshot?.progress);
  const settings = useGame((s) => s.snapshot?.settings);
  const stats = useGame((s) => s.stats);
  const refreshStats = useGame((s) => s.refreshStats);
  const updateSettings = useGame((s) => s.updateSettings);
  const refillHearts = useGame((s) => s.refillHearts);
  const resetGame = useGame((s) => s.resetGame);
  const setView = useGame((s) => s.setView);
  const [confirmReset, setConfirmReset] = useState(false);
  const refreshAchievements = useGame((s) => s.refreshAchievements);

  // load stats + achievements on mount
  useEffect(() => {
    refreshStats();
    refreshAchievements();
  }, [refreshStats, refreshAchievements]);

  if (!snapshot) return null;
  const learner = snapshot.learner;
  const hearts = snapshot.hearts;

  const leagueInfo = LEAGUES_INFO[learner.league] ?? LEAGUES_INFO.bronze;
  const completionPct =
    (progress?.totalLessons ?? 0) > 0
      ? Math.round(((progress?.completedLessons ?? 0) / (progress?.totalLessons ?? 0)) * 100)
      : 0;

  // league progress ring values
  const leagueBaseline = leagueInfo.threshold;
  const leagueTarget = learner.nextLeagueThreshold ?? learner.xp;
  const leaguePct =
    leagueTarget > leagueBaseline
      ? Math.round(
          ((learner.xp - leagueBaseline) / (leagueTarget - leagueBaseline)) * 100
        )
      : 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button
        onClick={() => setView("home")}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      {/* header with progress ring */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative overflow-hidden rounded-3xl p-6"
      >
        <div className="flex items-center gap-5">
          {/* progress ring with league emoji */}
          <ProgressRing
            value={learner.xp}
            target={leagueTarget}
            baseline={leagueBaseline}
            size={100}
            strokeWidth={7}
            accent={learner.league === "bronze" ? "amber" : "teal"}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl">{leagueInfo.emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {leaguePct}%
              </span>
            </div>
          </ProgressRing>

          <div className="flex-1 text-left">
            <h1 className="font-display text-2xl font-bold">{learner.name}</h1>
            <p className="text-sm text-muted-foreground">
              Liga {leagueInfo.label} · {learner.xp} XP
            </p>
            <p className="mt-1 text-xs italic text-muted-foreground">
              {leagueInfo.blurb}
            </p>
            {learner.nextLeagueThreshold !== null && (
              <p className="mt-1.5 text-xs font-semibold text-neon-teal">
                Faltam {learner.nextLeagueThreshold - learner.xp} XP para subir
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* stats grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ProfileStat
          icon={<Flame className="h-5 w-5 text-neon-amber" />}
          label="Ofensiva"
          value={`${streak?.current ?? 0}`}
          sub={`recorde ${streak?.longest ?? 0}`}
        />
        <ProfileStat
          icon={<Heart className="h-5 w-5 text-neon-rose" fill="currentColor" />}
          label="Vidas"
          value={`${hearts.current}/${hearts.max}`}
          sub={
            hearts.current < hearts.max ? (
              <button
                onClick={() => refillHearts()}
                className="text-neon-teal hover:underline"
              >
                recuperar
              </button>
            ) : (
              "cheio"
            )
          }
        />
        <ProfileStat
          icon={<Gem className="h-5 w-5 text-neon-teal" />}
          label="Gemas"
          value={`${learner.gems}`}
          sub="moeda cozy"
        />
        <ProfileStat
          icon={<Zap className="h-5 w-5 text-neon-magenta" />}
          label="XP liga"
          value={`${learner.leagueXp}`}
          sub="esta semana"
        />
      </div>

      {/* completion progress */}
      <div className="mt-5 glass-panel rounded-3xl p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Jornada
          </h3>
          <span className="text-sm font-bold text-neon-teal">
            {progress?.completedLessons ?? 0}/{progress?.totalLessons ?? 0} lições
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-background/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--neon-teal), var(--neon-amber))",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {completionPct}% concluído
        </p>
      </div>

      {/* stats dashboard */}
      {stats && (
        <div className="mt-5 glass-panel rounded-3xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-neon-teal" />
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Estatísticas
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              icon={<Target className="h-4 w-4 text-neon-amber" />}
              label="Precisão média"
              value={`${stats.avgAccuracy}%`}
              sub={`${stats.totalStars}/${stats.maxStars} ★`}
            />
            <StatTile
              icon={<Flame className="h-4 w-4 text-neon-amber" />}
              label="Recorde de ofensiva"
              value={`${stats.bestStreak}`}
              sub="dias"
            />
            <StatTile
              icon={<RotateCw className="h-4 w-4 text-neon-teal" />}
              label="Práticas"
              value={`${stats.practiceCount}`}
              sub="revisões"
            />
            <StatTile
              icon={<MessageSquare className="h-4 w-4 text-neon-teal" />}
              label="Conversas IA"
              value={`${stats.playgroundCount}`}
              sub="threads"
            />
            <StatTile
              icon={<Award className="h-4 w-4 text-neon-magenta" />}
              label="Conquistas"
              value={`${stats.achievementsUnlocked}`}
              sub="selos"
            />
            <StatTile
              icon={<Zap className="h-4 w-4 text-neon-magenta" />}
              label="XP total"
              value={`${stats.totalXp}`}
              sub="acumulado"
            />
          </div>
        </div>
      )}

      {/* achievements preview */}
      <AchievementsPreview />

      {/* league ladder */}
      <div className="mt-5 glass-panel rounded-3xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-neon-magenta" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Escada das ligas
          </h3>
        </div>
        <div className="space-y-2">
          {LEAGUE_ORDER.map((lkey) => {
            const l = LEAGUES_INFO[lkey];
            const active = learner.league === lkey;
            const reached = learner.xp >= l.threshold;
            return (
              <div
                key={lkey}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  active
                    ? "border-neon-magenta/60 bg-neon-magenta/10"
                    : reached
                    ? "border-border/60 bg-card/40"
                    : "border-border/40 bg-card/20 opacity-60"
                }`}
              >
                <span className="text-lg">{l.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{l.label}</p>
                  <p className="text-xs text-muted-foreground">{l.blurb}</p>
                </div>
                <span className="text-xs font-bold tabular-nums text-muted-foreground">
                  {l.threshold} XP
                </span>
                {active && (
                  <span className="rounded-full bg-neon-magenta/20 px-2 py-0.5 text-[10px] font-bold uppercase text-neon-magenta">
                    atual
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* activity timeline */}
      <div className="mt-5 glass-panel rounded-3xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-neon-teal" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Linha do tempo
          </h3>
        </div>
        <ActivityFeed />
      </div>

      {/* settings */}
      <div className="mt-5 glass-panel rounded-3xl p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Preferências
        </h3>
        <div className="space-y-2">
          <SettingRow
            icon={
              settings?.sound ? (
                <Volume2 className="h-4 w-4 text-neon-teal" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )
            }
            label="Som (feedback de acerto/erro)"
            value={settings?.sound ?? true}
            onChange={(v) => updateSettings({ sound: v })}
          />
          <SettingRow
            icon={<CloudRain className="h-4 w-4 text-neon-teal" />}
            label="Chuva de Tóquio (atmosfera)"
            value={settings?.rain ?? true}
            onChange={(v) => updateSettings({ rain: v })}
          />
          <SettingRow
            icon={<Sparkles className="h-4 w-4 text-neon-magenta" />}
            label="Movimento reduzido"
            value={settings?.reducedMotion ?? false}
            onChange={(v) => updateSettings({ reducedMotion: v })}
          />
        </div>
      </div>

      {/* danger zone */}
      <div className="mt-5 rounded-3xl border border-neon-rose/30 bg-neon-rose/5 p-5">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-neon-rose" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-neon-rose">
            Reiniciar progresso
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Apaga toda a sua jornada: XP, ofensiva, gemas e lições concluídas. Não
          dá pra desfazer.
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 rounded-xl border border-neon-rose/50 bg-neon-rose/10 px-4 py-2 text-sm font-semibold text-neon-rose transition hover:bg-neon-rose/20"
          >
            <RotateCcw className="h-4 w-4" /> Reiniciar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetGame();
                setConfirmReset(false);
              }}
              className="flex items-center gap-2 rounded-xl bg-neon-rose px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" /> Confirmar reinício
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="rounded-xl border border-border bg-card/60 px-4 py-2 text-sm font-semibold transition hover:border-primary/50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileStat({
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
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4 text-center">
      <div className="mb-1.5 flex justify-center">{icon}</div>
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-center transition hover:border-border/80">
      <div className="mb-1 flex items-center justify-center gap-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function AchievementsPreview() {
  const achievements = useGame((s) => s.achievements);
  const setView = useGame((s) => s.setView);

  if (!achievements) return null;

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const totalUnlocked = unlocked.length;
  const total = achievements.length;

  return (
    <div className="mt-5 glass-panel rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-neon-amber" />
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Conquistas recentes
          </h3>
        </div>
        <button
          onClick={() => setView("achievements")}
          className="text-xs font-bold text-neon-amber transition hover:underline"
        >
          Ver todas ({totalUnlocked}/{total})
        </button>
      </div>

      {unlocked.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-card/30 p-4 text-center text-sm text-muted-foreground">
          Nenhuma conquista ainda. Complete lições para desbloquear selos!
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto cozy-scroll pb-2">
          {unlocked.slice(0, 8).map((a, i) => (
            <motion.div
              key={a.slug}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex shrink-0 flex-col items-center gap-1"
              title={a.title}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neon-amber/40 bg-background/60 text-2xl">
                {a.emoji}
              </div>
              <span className="max-w-[60px] truncate text-[10px] font-semibold text-muted-foreground">
                {a.title}
              </span>
            </motion.div>
          ))}
          {/* show first locked as a teaser */}
          {locked.length > 0 && unlocked.length < 8 && (
            <div
              className="flex shrink-0 flex-col items-center gap-1 opacity-50"
              title="Conquista bloqueada"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/40 bg-background/30 text-xl">
                🔒
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">???</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/30 px-3 py-2.5">
      {icon}
      <span className="flex-1 text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${
          value ? "bg-primary" : "bg-muted"
        }`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
