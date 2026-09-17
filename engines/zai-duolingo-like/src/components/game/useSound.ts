"use client";

import { useCallback, useRef } from "react";
import { useGame } from "./store";

// Cozy sound effects synthesized with the Web Audio API (no asset files needed).
// Each effect is a short, soft, pleasant tone. Respects the `sound` setting.

type SoundName = "correct" | "wrong" | "reveal" | "complete" | "achievement" | "tap";

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const soundOn = useGame((s) => s.snapshot?.settings?.sound ?? true);

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    // resume if suspended (autoplay policy)
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (
      freq: number,
      duration: number,
      type: OscillatorType = "sine",
      gain = 0.12,
      startAt = 0
    ) => {
      if (!soundOn) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime + startAt;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      // soft attack/decay envelope
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    },
    [getCtx, soundOn]
  );

  const play = useCallback(
    (name: SoundName) => {
      if (!soundOn) return;
      switch (name) {
        case "correct":
          // bright ascending two-note (C5 → E5)
          playTone(523.25, 0.18, "triangle", 0.12, 0);
          playTone(659.25, 0.22, "triangle", 0.1, 0.08);
          break;
        case "wrong":
          // soft descending two-note (A4 → F4), low gain
          playTone(440, 0.16, "sine", 0.09, 0);
          playTone(349.23, 0.22, "sine", 0.08, 0.07);
          break;
        case "reveal":
          // gentle shimmer (high soft sine)
          playTone(880, 0.12, "sine", 0.06, 0);
          playTone(1046.5, 0.18, "sine", 0.05, 0.05);
          break;
        case "tap":
          // tiny click
          playTone(660, 0.05, "square", 0.04, 0);
          break;
        case "complete":
          // happy arpeggio C5 E5 G5 C6
          playTone(523.25, 0.16, "triangle", 0.1, 0);
          playTone(659.25, 0.16, "triangle", 0.1, 0.12);
          playTone(783.99, 0.16, "triangle", 0.1, 0.24);
          playTone(1046.5, 0.32, "triangle", 0.12, 0.36);
          break;
        case "achievement":
          // sparkly reward (C6 + E6 + high shimmer)
          playTone(1046.5, 0.14, "triangle", 0.1, 0);
          playTone(1318.51, 0.14, "triangle", 0.09, 0.08);
          playTone(1567.98, 0.18, "triangle", 0.08, 0.16);
          playTone(2093, 0.3, "sine", 0.06, 0.24);
          break;
      }
    },
    [playTone, soundOn]
  );

  return play;
}
