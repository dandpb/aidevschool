"use client";

import { useMemo } from "react";
import { useGame } from "./store";

const COLORS = [
  "var(--neon-amber)",
  "var(--neon-teal)",
  "var(--neon-magenta)",
  "var(--neon-rose)",
  "var(--neon-violet)",
];

export function Confetti({ count = 80 }: { count?: number }) {
  const reducedMotion = useGame((s) => s.snapshot?.settings?.reducedMotion);

  const pieces = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 0 : count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        rounded: Math.random() > 0.5,
      })),
    [count, reducedMotion]
  );

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.rounded ? 1 : 0.5),
            background: p.color,
            borderRadius: p.rounded ? "999px" : "2px",
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}
