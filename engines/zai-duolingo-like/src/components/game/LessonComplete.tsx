"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Zap, HeartCrack, Flame, Sparkles, ChevronRight, Home, RotateCw, Gem } from "lucide-react";
import { useGame } from "./store";
import type { ClientLesson, ClientModule } from "./types";
import { Bip } from "./Bip";
import { Confetti } from "./Confetti";

export function LessonComplete() {
  const lastResult = useGame((s) => s.lastResult);
  const lastPracticeResult = useGame((s) => s.lastPracticeResult);
  const practiceMode = useGame((s) => s.practiceMode);
  const snapshot = useGame((s) => s.snapshot);
  const streak = useGame((s) => s.snapshot?.streak);
  const curriculum = useGame((s) => s.curriculum);
  const active = useGame((s) => s.activeLesson);
  const setView = useGame((s) => s.setView);
  const startLesson = useGame((s) => s.startLesson);
  const startPractice = useGame((s) => s.startPractice);

  // practice mode uses the practice result; otherwise the lesson result
  const result = practiceMode ? lastPracticeResult : lastResult;

  // no result means we landed here without finishing a lesson (e.g. reload):
  // redirect to the path view from an effect, never during render
  useEffect(() => {
    if (!result) setView("path");
  }, [result, setView]);

  if (!result) {
    return null;
  }

  const { passed, correctCount, total } = result;

  // practice-specific fields
  const gemsGained = practiceMode
    ? (lastPracticeResult?.gemsGained ?? 0)
    : (lastResult?.gemsGained ?? 0);
  const xpGained = practiceMode ? 0 : (lastResult?.xpGained ?? 0);
  const heartsLost = practiceMode ? 0 : (lastResult?.heartsLost ?? 0);
  const stars = practiceMode ? 0 : (lastResult?.stars ?? 0);
  const streakTouched = practiceMode ? false : (lastResult?.streakTouched ?? false);
  const streakBroke = practiceMode ? false : (lastResult?.streakBroke ?? false);
  const newStreak = practiceMode ? (streak?.current ?? 0) : (lastResult?.newStreak ?? 0);

  // find next lesson (only relevant for non-practice)
  let nextLesson: { lesson: ClientLesson; module: ClientModule } | null = null;
  if (!practiceMode && curriculum && active) {
    const allLessons: { lesson: ClientLesson; module: ClientModule }[] = [];
    curriculum.forEach((m) =>
      m.lessons.forEach((l) => allLessons.push({ lesson: l, module: m }))
    );
    const currentPos = allLessons.findIndex(
      (x) => x.lesson.id === active.lesson.id
    );
    if (currentPos >= 0 && currentPos < allLessons.length - 1) {
      const candidate = allLessons[currentPos + 1];
      if (candidate.lesson.unlocked) nextLesson = candidate;
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 py-8 text-center">
      {passed && <Confetti />}

      <Bip mood={passed ? "happy" : "sad"} size={140} />

      <motion.h1
        initial={{ opacity: 0, y: 16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className={`mt-4 font-display text-3xl font-bold ${
          passed
            ? practiceMode
              ? "neon-text-teal"
              : "neon-text-amber"
            : "neon-text-rose"
        }`}
      >
        {practiceMode
          ? passed
            ? "Prática concluída!"
            : "Continue praticando"
          : passed
          ? "Lição completa!"
          : "Continue tentando"}
      </motion.h1>

      <p className="mt-2 text-sm text-muted-foreground">
        {practiceMode ? (
          passed
            ? `${correctCount} de ${total} corretos — +${gemsGained} gemas coletadas.`
            : `Você acertou ${correctCount} de ${total}. Refaça para ganhar gemas.`
        ) : passed
          ? `${correctCount} de ${total} corretos — Decadência Lógica reduzida.`
          : `Você acertou ${correctCount} de ${total}. Refaça para dominar o padrão.`}
      </p>

      {/* stars */}
      {passed && (
        <div className="mt-5 flex gap-2">
          {[0, 1, 2].map((s) => (
            <motion.div
              key={s}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2 + s * 0.15, type: "spring", stiffness: 260, damping: 12 }}
            >
              <Star
                className={`h-12 w-12 ${
                  s < stars
                    ? "fill-neon-amber text-neon-amber drop-shadow-[0_0_12px_oklch(0.84_0.17_66_/_0.7)]"
                    : "text-muted-foreground/30"
                }`}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* reward grid */}
      <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {!practiceMode && (
          <RewardCard
            icon={<Zap className="h-5 w-5 text-neon-magenta" />}
            label="XP"
            value={`+${xpGained}`}
            highlight
          />
        )}
        <RewardCard
          icon={<Gem className={practiceMode ? "h-5 w-5 text-neon-teal" : "h-5 w-5 text-neon-teal"} />}
          label="Gemas"
          value={`+${practiceMode ? gemsGained : passed ? 2 : 0}`}
          highlight={practiceMode}
        />
        {!practiceMode && (
          <RewardCard
            icon={<HeartCrack className="h-5 w-5 text-neon-rose" />}
            label="Vidas"
            value={heartsLost > 0 ? `-${heartsLost}` : "0"}
          />
        )}
        {!practiceMode && (
          <RewardCard
            icon={<Flame className="h-5 w-5 text-neon-amber" />}
            label="Ofensiva"
            value={streakTouched ? `${newStreak} 🔥` : `${streak?.current ?? 0}`}
          />
        )}
      </div>

      {/* streak banner */}
      {streakTouched && !streakBroke && (newStreak ?? 0) > 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-neon-amber/40 bg-neon-amber/10 px-4 py-2 text-sm"
        >
          <Flame className="h-4 w-4 text-neon-amber" />
          Ofensiva estendida para {newStreak} dias!
        </motion.div>
      )}
      {streakBroke && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-neon-rose/40 bg-neon-rose/10 px-4 py-2 text-sm"
        >
          <Flame className="h-4 w-4 text-neon-rose" />
          Ofensiva reiniciada — mas hoje conta! Dia 1.
        </motion.div>
      )}

      {/* low hearts warning */}
      {snapshot && snapshot.hearts.current === 0 && (
        <div className="mt-4 rounded-xl border border-neon-rose/40 bg-neon-rose/10 px-4 py-3 text-sm">
          <p className="font-semibold text-neon-rose">Sem vidas!</p>
          <p className="text-muted-foreground">
            Recupere na tela inicial (5 gemas) ou aguarde a regeneração.
          </p>
        </div>
      )}

      {/* daily challenge bonus banner */}
      {!practiceMode && lastResult?.dailyChallengeAwarded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.3 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-neon-teal/50 bg-neon-teal/10 px-4 py-3 text-sm"
        >
          <Sparkles className="h-4 w-4 animate-flicker text-neon-teal" />
          <span className="font-semibold text-neon-teal">
            🎯 Desafio do dia completo! +{lastResult.dailyChallengeGems} 💎 bônus
          </span>
        </motion.div>
      )}

      {/* actions */}
      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {practiceMode ? (
          <button
            onClick={() => active && startPractice(active.lesson, active.module)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-neon-teal/50 bg-neon-teal/10 px-6 py-3.5 font-display text-base font-bold text-neon-teal transition hover:bg-neon-teal/20"
          >
            <RotateCw className="h-5 w-5" />
            Praticar de novo
          </button>
        ) : (
          nextLesson && (
            <button
              onClick={() => startLesson(nextLesson!.lesson, nextLesson!.module)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-display text-base font-bold text-primary-foreground shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.4)] transition hover:shadow-[0_0_44px_oklch(0.84_0.17_66_/_0.65)]"
            >
              Próxima lição
              <ChevronRight className="h-5 w-5" />
            </button>
          )
        )}
        <button
          onClick={() => setView("path")}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-6 py-3.5 font-semibold transition hover:border-primary/60"
        >
          Trilha
        </button>
        <button
          onClick={() => setView("home")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-6 py-3.5 font-semibold transition hover:border-primary/60"
        >
          <Home className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function RewardCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight
          ? "border-neon-magenta/50 bg-neon-magenta/10"
          : "border-border/60 bg-card/50"
      }`}
    >
      <div className="mb-1 flex items-center justify-center gap-1.5">
        {icon}
      </div>
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
