"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  Check,
  Lightbulb,
  HeartCrack,
  Sparkles,
  RotateCw,
} from "lucide-react";
import { useGame } from "./store";
import { Bip } from "./Bip";
import { useSound } from "./useSound";
import { MultipleChoiceExercise } from "./exercises/MultipleChoiceExercise";
import { TrueFalseExercise } from "./exercises/TrueFalseExercise";
import { FillBlankExercise } from "./exercises/FillBlankExercise";
import { SwipeExercise } from "./exercises/SwipeExercise";
import { OrderExercise } from "./exercises/OrderExercise";
import type { ClientExercise } from "./types";

const TYPE_LABEL: Record<ClientExercise["type"], string> = {
  "multiple-choice": "Múltipla escolha",
  "true-false": "Verdadeiro ou Falso",
  "fill-blank": "Complete a lacuna",
  swipe: "Deslize para julgar",
  order: "Ordene os passos",
};

export function LessonPlayer() {
  const active = useGame((s) => s.activeLesson);
  const idx = useGame((s) => s.activeExerciseIdx);
  const answers = useGame((s) => s.answers);
  const setAnswer = useGame((s) => s.setAnswer);
  const goNext = useGame((s) => s.goNextExercise);
  const goPrev = useGame((s) => s.goPrevExercise);
  const submitLesson = useGame((s) => s.submitLesson);
  const submitPractice = useGame((s) => s.submitPractice);
  const practiceMode = useGame((s) => s.practiceMode);
  const setView = useGame((s) => s.setView);
  const setBipMood = useGame((s) => s.setBipMood);
  const loading = useGame((s) => s.loading);
  const play = useSound();

  const submit = practiceMode ? submitPractice : submitLesson;

  const [phase, setPhase] = useState<"intro" | "playing">("intro");
  const [revealed, setRevealed] = useState(false);

  if (!active) {
    return null;
  }

  const { lesson, module: mod, exercises } = active;
  const ex = exercises[idx];
  const isLast = idx === exercises.length - 1;
  const total = exercises.length;
  const progressPct = ((idx + (revealed ? 1 : 0)) / total) * 100;

  // current answer
  const currentAnswer = answers[idx];

  // determine if answered (enough to check)
  function isAnswered(a: unknown, e: ClientExercise): boolean {
    if (a === null || a === undefined) return false;
    switch (e.type) {
      case "multiple-choice":
        return typeof a === "number";
      case "true-false":
        return typeof a === "boolean";
      case "fill-blank":
        return Array.isArray(a) && (a as unknown[]).every((x) => x !== null);
      case "swipe":
        return Array.isArray(a) && (a as unknown[]).length === (e.items?.length ?? 0);
      case "order":
        return Array.isArray(a) && (a as unknown[]).length === (e.items?.length ?? 0);
      default:
        return false;
    }
  }

  // grade locally for reveal feedback (mirrors server logic)
  function gradeLocal(e: ClientExercise, a: unknown): boolean {
    switch (e.type) {
      case "multiple-choice":
        return a === e.correctIndex;
      case "true-false":
        return a === e.isTrue;
      case "fill-blank": {
        if (!Array.isArray(a)) return false;
        return (a as number[]).every((bankIdx, slot) => {
          const bank = e.banks?.[bankIdx];
          return bank?.correctSlot === slot;
        });
      }
      case "swipe": {
        if (!Array.isArray(a)) return false;
        return (e.items ?? []).every((item, i) => (a as ("ai" | "real")[])[i] === (typeof item === "string" ? item : item.value));
      }
      case "order": {
        if (!Array.isArray(a)) return false;
        return (e.correctOrder ?? []).every((origIdx, i) => (a as number[])[i] === origIdx);
      }
      default:
        return false;
    }
  }

  const handleCheck = () => {
    setRevealed(true);
    const correct = gradeLocal(ex, currentAnswer);
    setBipMood(correct ? "happy" : "sad");
    play(correct ? "correct" : "wrong");
    if (correct) setTimeout(() => play("reveal"), 120);
  };

  const handleContinue = () => {
    if (isLast) {
      play("complete");
      submit();
    } else {
      setRevealed(false);
      setBipMood("idle");
      goNext();
    }
  };

  const handleQuit = () => {
    setView("path");
  };

  // ===== INTRO PHASE =====
  if (phase === "intro") {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center px-4 py-6">
        <button
          onClick={handleQuit}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Sair da lição
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-3xl p-6 text-center sm:p-8"
        >
          <div className="mx-auto mb-2 flex items-center justify-center gap-2">
            <img src={mod.icon} alt="" className="h-8 w-8 object-contain" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {mod.title}
            </span>
          </div>
          <Bip mood="thinking" size={120} />
          {practiceMode && (
            <div className="mx-auto mt-3 flex items-center gap-1.5 rounded-full border border-neon-teal/50 bg-neon-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-neon-teal">
              <RotateCw className="h-3 w-3" /> Modo prática
            </div>
          )}
          <h1 className="mt-4 font-display text-2xl font-bold neon-text-amber sm:text-3xl">
            {lesson.title}
          </h1>
          <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">
            {lesson.narrative}
          </p>

          <div className="mt-5 rounded-2xl border border-neon-teal/30 bg-neon-teal/5 p-4 text-left">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-neon-teal">
              <Lightbulb className="h-3.5 w-3.5" /> Pílula de conhecimento
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{lesson.tip}</p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            {practiceMode ? (
              <>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-neon-teal" /> +1-3 💎
                </span>
                <span>·</span>
                <span>sem custo de vidas</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-neon-magenta" /> +{lesson.xpReward} XP
                </span>
                <span>·</span>
                <span>{total} exercícios</span>
                <span>·</span>
                <span>~3 min</span>
              </>
            )}
          </div>

          <button
            onClick={() => setPhase("playing")}
            className="mt-6 w-full rounded-2xl bg-primary px-6 py-4 font-display text-lg font-bold text-primary-foreground shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.4)] transition hover:shadow-[0_0_44px_oklch(0.84_0.17_66_/_0.65)]"
          >
            Começar
          </button>
        </motion.div>
      </div>
    );
  }

  // ===== PLAYING PHASE =====
  const answered = isAnswered(currentAnswer, ex);
  const correct = gradeLocal(ex, currentAnswer);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      {/* top bar: progress + quit */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handleQuit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground transition hover:text-foreground"
          aria-label="Sair"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-background/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-neon-amber to-neon-magenta"
            style={{
              width: `${progressPct}%`,
              background:
                "linear-gradient(90deg, var(--neon-amber), var(--neon-magenta))",
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
          {idx + 1}/{total}
        </span>
      </div>

      {/* mood + title */}
      <div className="mb-4 flex items-center gap-3">
        <Bip mood={revealed ? (correct ? "happy" : "sad") : "idle"} size={56} float={false} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neon-teal">
            {TYPE_LABEL[ex.type]}
          </p>
          <h2 className="font-display text-lg font-bold leading-tight">{ex.prompt}</h2>
        </div>
      </div>

      {/* exercise body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={ex.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          {ex.type === "multiple-choice" && (
            <MultipleChoiceExercise
              exercise={ex}
              answer={currentAnswer as number | null}
              revealed={revealed}
              onAnswer={(i) => setAnswer(idx, i)}
            />
          )}
          {ex.type === "true-false" && (
            <TrueFalseExercise
              exercise={ex}
              answer={currentAnswer as boolean | null}
              revealed={revealed}
              onAnswer={(v) => setAnswer(idx, v)}
            />
          )}
          {ex.type === "fill-blank" && (
            <FillBlankExercise
              exercise={ex}
              answer={currentAnswer as (number | null)[] | null}
              revealed={revealed}
              onAnswer={(s) => setAnswer(idx, s)}
            />
          )}
          {ex.type === "swipe" && (
            <SwipeExercise
              exercise={ex}
              answer={currentAnswer as ("ai" | "real")[] | null}
              revealed={revealed}
              onAnswer={(d) => setAnswer(idx, d)}
            />
          )}
          {ex.type === "order" && (
            <OrderExercise
              exercise={ex}
              answer={currentAnswer as number[] | null}
              revealed={revealed}
              onAnswer={(o) => setAnswer(idx, o)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* explanation on reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 16, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            className="mt-4 overflow-hidden"
          >
            <div
              className={`rounded-2xl border p-4 ${
                correct
                  ? "border-neon-teal/40 bg-neon-teal/10"
                  : "border-neon-rose/40 bg-neon-rose/10"
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                {correct ? (
                  <Check className="h-4 w-4 text-neon-teal" />
                ) : (
                  <HeartCrack className="h-4 w-4 text-neon-rose" />
                )}
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    correct ? "text-neon-teal" : "text-neon-rose"
                  }`}
                >
                  {correct ? "Padrão reconhecido" : "Estática nos dados"}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                {ex.explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* action bar */}
      <div className="mt-5 flex items-center gap-3">
        {!revealed ? (
          <>
            {idx > 0 && (
              <button
                onClick={() => {
                  setRevealed(false);
                  goPrev();
                }}
                className="rounded-2xl border border-border bg-card/60 px-5 py-3.5 text-sm font-semibold transition hover:border-primary/50"
                aria-label="Questão anterior"
                title="Questão anterior"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={handleCheck}
              disabled={!answered}
              className="flex-1 rounded-2xl bg-primary px-6 py-3.5 font-display text-base font-bold text-primary-foreground shadow-[0_0_24px_oklch(0.84_0.17_66_/_0.35)] transition hover:shadow-[0_0_36px_oklch(0.84_0.17_66_/_0.6)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Verificar
            </button>
          </>
        ) : (
          <button
            onClick={handleContinue}
            disabled={loading}
            className="flex-1 rounded-2xl bg-primary px-6 py-3.5 font-display text-base font-bold text-primary-foreground shadow-[0_0_24px_oklch(0.84_0.17_66_/_0.35)] transition hover:shadow-[0_0_36px_oklch(0.84_0.17_66_/_0.6)] disabled:opacity-60"
          >
            {loading ? "Compilando..." : isLast ? "Finalizar lição" : "Continuar"}
          </button>
        )}
      </div>
    </div>
  );
}
