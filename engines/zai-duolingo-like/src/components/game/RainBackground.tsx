"use client";

import { useMemo, useSyncExternalStore } from "react";

interface RainBackgroundProps {
  enabled: boolean;
  reducedMotion?: boolean;
  variant?: "tokyo" | "akihabara" | "odaiba";
}

// Pure-CSS animated rain + drifting glow background for the cozy cyberpunk Tokyo vibe.
// Randomized drops are generated only after client mount to avoid SSR hydration mismatch.
export function RainBackground({
  enabled,
  reducedMotion = false,
  variant = "tokyo",
}: RainBackgroundProps) {
  // hydration-safe client detection (same pattern as page.tsx): false on the
  // server and during hydration, true after — no setState-in-effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const drops = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 24 : 64 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 0.6 + Math.random() * 0.8,
        height: 14 + Math.random() * 26,
        opacity: 0.15 + Math.random() * 0.35,
      })),
    [reducedMotion]
  );

  const bgImage =
    variant === "akihabara"
      ? "/art/akihabara-neon.png"
      : variant === "odaiba"
      ? "/art/odaiba-shrine.png"
      : "/art/tokyo-rain.png";

  if (reducedMotion) {
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-background/55" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* drifting background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{
          backgroundImage: `url(${bgImage})`,
          animation: "drift 28s ease-in-out infinite",
        }}
      />
      {/* color wash */}
      <div className="absolute inset-0 bg-background/55" />

      {/* neon glow orbs */}
      <div
        className="absolute -top-24 -left-16 h-[40vh] w-[40vh] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.84 0.17 66 / 0.16), transparent 70%)",
          animation: "float-soft 9s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/3 -right-20 h-[36vh] w-[36vh] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.22 352 / 0.13), transparent 70%)",
          animation: "float-soft 11s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[30vh] w-[30vh] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.14 198 / 0.12), transparent 70%)",
          animation: "float-soft 13s ease-in-out infinite",
        }}
      />

      {/* rain — only after mount to keep SSR/CSR markup identical */}
      {enabled && mounted && (
        <div className="absolute inset-0">
          {drops.map((d, i) => (
            <span
              key={i}
              className="absolute top-0 w-px"
              style={{
                left: `${d.left}%`,
                height: `${d.height}px`,
                background: `linear-gradient(to bottom, transparent, oklch(0.85 0.06 200 / ${d.opacity}))`,
                animation: `rain-fall ${d.duration}s linear ${d.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* subtle scan line */}
      <div
        className="absolute inset-x-0 h-32 opacity-[0.06]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, oklch(0.78 0.14 198 / 0.5), transparent)",
          animation: "scan-line 8s linear infinite",
        }}
      />

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, oklch(0.1 0.02 285 / 0.55) 100%)",
        }}
      />
    </div>
  );
}
