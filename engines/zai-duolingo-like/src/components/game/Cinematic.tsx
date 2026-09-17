"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronRight } from "lucide-react";
import { useGame } from "./store";
import { Bip } from "./Bip";

const SCRIPT = [
  "VERTICAL PROTOCOL",
  "Arquitetando a vida após a morte digital",
  "em uma Tóquio opressiva, úmida e escorregada de chuva.",
  "",
  "O ar é pesado de decadência lógica.",
  "Cada respiração parece um pacote de dados corrompido.",
  "",
  "Você é um Compilador.",
  "Domine a IA. Salve o distrito.",
];

export function Cinematic() {
  const setView = useGame((s) => s.setView);
  const bootstrap = useGame((s) => s.bootstrap);
  const snapshot = useGame((s) => s.snapshot);
  const [playing, setPlaying] = useState(true);
  const [line, setLine] = useState(0);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!playing) return;
    if (line >= SCRIPT.length) return;
    const t = setTimeout(() => setLine((l) => l + 1), 1100);
    return () => clearTimeout(t);
  }, [playing, line]);

  const restart = () => {
    setLine(0);
    setPlaying(true);
  };

  const done = line >= SCRIPT.length;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-10">
      {/* cinematic letterbox bars */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[8vh] bg-background" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[8vh] bg-background" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <Bip mood="thinking" size={120} float />

        <div className="mt-6 min-h-[260px] sm:min-h-[220px]">
          <AnimatePresence>
            {SCRIPT.slice(0, line).map((text, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                animate={{ opacity: text === "" ? 0 : 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7 }}
                className={
                  i === 0
                    ? "font-display text-3xl font-bold tracking-tight neon-text-amber sm:text-5xl"
                    : i === 1
                    ? "mt-3 text-base text-foreground/90 sm:text-lg"
                    : i === 2
                    ? "text-sm text-muted-foreground sm:text-base"
                    : "mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base"
                }
              >
                {text || "\u00A0"}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>

        {/* controls */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium backdrop-blur transition hover:border-primary/60 hover:bg-card"
          >
            {playing ? (
              <>
                <Pause className="h-4 w-4" /> Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Reproduzir
              </>
            )}
          </button>
          <button
            onClick={restart}
            className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium backdrop-blur transition hover:border-primary/60 hover:bg-card"
          >
            <RotateCcw className="h-4 w-4" /> Reiniciar
          </button>
        </div>

        {/* enter CTA */}
        <AnimatePresence>
          {done && (
            <motion.button
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              onClick={() => setView(snapshot?.learner && snapshot.learner.name !== "Recruta" ? "home" : "onboarding")}
              className="group mt-8 flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-display text-base font-bold text-primary-foreground shadow-[0_0_28px_oklch(0.84_0.17_66_/_0.45)] transition hover:shadow-[0_0_40px_oklch(0.84_0.17_66_/_0.7)]"
            >
              Entrar no Protocolo
              <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* skip */}
        <button
          onClick={() => setView(snapshot?.learner && snapshot.learner.name !== "Recruta" ? "home" : "onboarding")}
          className="mt-4 text-xs uppercase tracking-widest text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          pular introdução
        </button>
      </div>
    </div>
  );
}
