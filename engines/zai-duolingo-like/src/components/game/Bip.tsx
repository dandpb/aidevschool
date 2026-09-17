"use client";

import { motion } from "framer-motion";
import { useGame } from "./store";

type Mood = "idle" | "happy" | "sad" | "thinking" | "sleep";

const MOOD_SRC: Record<Mood, string> = {
  idle: "/art/bip-idle.png",
  happy: "/art/bip-happy.png",
  sad: "/art/bip-sad.png",
  thinking: "/art/bip-thinking.png",
  sleep: "/art/bip-sleep.png",
};

const MOOD_LABEL: Record<Mood, string> = {
  idle: "Pronto para compilar.",
  happy: "Isso! Padrão reconhecido!",
  sad: "Hmm... estática nos dados.",
  thinking: "Processando...",
  sleep: "Bip está descansando. Volte amanhã.",
};

interface BipProps {
  mood?: Mood;
  size?: number;
  float?: boolean;
  showSpeech?: boolean;
  speechText?: string;
  className?: string;
}

export function Bip({
  mood,
  size = 140,
  float = true,
  showSpeech = false,
  speechText,
  className = "",
}: BipProps) {
  const storeMood = useGame((s) => s.bipMood);
  const activeMood = mood ?? storeMood;

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <motion.div
        key={activeMood}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        <div
          className={`relative ${float ? "animate-float" : ""}`}
          style={{ width: size, height: size }}
        >
          {/* glow base */}
          <div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.78 0.14 198 / 0.35), transparent 70%)",
            }}
          />
          <img
            src={MOOD_SRC[activeMood]}
            alt={`Bip, o mascote — ${activeMood}`}
            className="relative z-10 h-full w-full object-contain drop-shadow-[0_8px_24px_oklch(0.84_0.17_66_/_0.35)]"
            draggable={false}
          />
        </div>
      </motion.div>

      {showSpeech && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative mt-2 max-w-[220px] rounded-2xl border border-border bg-card/90 px-4 py-2 text-center text-sm font-medium shadow-lg backdrop-blur"
        >
          <span
            className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card/90"
            aria-hidden
          />
          {speechText ?? MOOD_LABEL[activeMood]}
        </motion.div>
      )}
    </div>
  );
}
