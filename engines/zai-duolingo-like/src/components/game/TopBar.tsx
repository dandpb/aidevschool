"use client";

import { motion } from "framer-motion";
import { Heart, Flame, Gem, Zap, Volume2, VolumeX } from "lucide-react";
import { useGame } from "./store";
import { LEAGUES_INFO } from "./leagues";

function fmtMs(ms: number) {
  if (ms <= 0) return "";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TopBar({ onOpenProfile }: { onOpenProfile: () => void }) {
  const snapshot = useGame((s) => s.snapshot);
  const snapshotAt = useGame((s) => s.snapshotAt);
  const streak = useGame((s) => s.snapshot?.streak);
  const updateSettings = useGame((s) => s.updateSettings);
  const setView = useGame((s) => s.setView);

  if (!snapshot) return null;
  const learner = snapshot.learner;
  const hearts = snapshot.hearts;
  const settings = snapshot.settings;
  const heartRegenMs = hearts.nextRegenAt !== null ? hearts.nextRegenAt - snapshot.at - (Date.now() - snapshotAt) : 0;

  const leagueInfo = LEAGUES_INFO[learner.league as keyof typeof LEAGUES_INFO] ?? LEAGUES_INFO.bronze;
  const soundOn = settings?.sound ?? true;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        {/* mascot mini + name */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-2 py-1 transition hover:border-primary/60"
        >
          <img
            src="/art/bip-idle.png"
            alt="Bip"
            className="h-7 w-7 object-contain"
            draggable={false}
          />
          <span className="max-w-[70px] truncate text-sm font-semibold sm:max-w-[90px]">
            {learner.name}
          </span>
          <span className="text-xs">{leagueInfo.emoji}</span>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {/* streak */}
          <StatChip
            icon={<Flame className="h-4 w-4 text-neon-amber" />}
            value={streak?.current ?? 0}
            label="dias"
            accent="amber"
            active={(streak?.current ?? 0) > 0}
          />
          {/* gems — clickable to open shop */}
          <button
            onClick={() => setView("shop")}
            className="transition hover:scale-105"
            title="Abrir loja"
          >
            <StatChip
              icon={<Gem className="h-4 w-4 text-neon-teal" />}
              value={learner.gems}
              label="gemas"
              accent="teal"
            />
          </button>
          {/* xp */}
          <StatChip
            icon={<Zap className="h-4 w-4 text-neon-magenta" />}
            value={learner.xp}
            label="XP"
            accent="magenta"
          />
          {/* hearts */}
          <StatChip
            icon={<Heart className="h-4 w-4 text-neon-rose" fill="currentColor" />}
            value={`${hearts.current}/${hearts.max}`}
            label={
              hearts.current < hearts.max ? (
                <HeartCountdown key={snapshot.at} ms={heartRegenMs} />
              ) : (
                "cheio"
              )
            }
            accent="rose"
          />
          {/* sound quick-toggle */}
          <button
            onClick={() => updateSettings({ sound: !soundOn })}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/50 text-muted-foreground transition hover:border-neon-teal/50 hover:text-neon-teal"
            title={soundOn ? "Silenciar" : "Ativar som"}
            aria-label={soundOn ? "Silenciar" : "Ativar som"}
          >
            {soundOn ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function StatChip({
  icon,
  value,
  label,
  accent,
  active,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: React.ReactNode;
  accent: "amber" | "teal" | "magenta" | "rose";
  active?: boolean;
}) {
  const ring =
    accent === "amber"
      ? "border-neon-amber/40"
      : accent === "teal"
      ? "border-neon-teal/40"
      : accent === "magenta"
      ? "border-neon-magenta/40"
      : "border-neon-rose/40";
  return (
    <motion.div
      initial={false}
      className={`flex min-w-[58px] flex-col items-center rounded-xl border ${ring} bg-card/50 px-2 py-1 sm:flex-row sm:gap-1.5`}
      title={typeof label === "string" ? label : undefined}
    >
      <span className="flex items-center gap-1">
        {icon}
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </span>
      <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
        {label}
      </span>
    </motion.div>
  );
}

// heart regen countdown — remounts via key when the regen value changes
import { useEffect, useState } from "react";
function HeartCountdown({ ms }: { ms: number }) {
  const [remaining, setRemaining] = useState(ms);
  useEffect(() => {
    if (ms <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => (r > 1000 ? r - 1000 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  if (ms <= 0) return null;
  return <span className="tabular-nums">{fmtMs(remaining)}</span>;
}
