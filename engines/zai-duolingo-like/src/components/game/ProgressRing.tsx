"use client";

import { motion } from "framer-motion";

interface ProgressRingProps {
  /** current value */
  value: number;
  /** target value (for percentage calc) */
  target: number;
  /** baseline value to subtract (so we measure progress within the current tier) */
  baseline?: number;
  /** size in px */
  size?: number;
  /** stroke width in px */
  strokeWidth?: number;
  /** emoji or icon to show in the center */
  children?: React.ReactNode;
  /** accent color: amber | teal | magenta | rose */
  accent?: "amber" | "teal" | "magenta" | "rose";
}

const ACCENT_COLOR: Record<string, string> = {
  amber: "var(--neon-amber)",
  teal: "var(--neon-teal)",
  magenta: "var(--neon-magenta)",
  rose: "var(--neon-rose)",
};

export function ProgressRing({
  value,
  target,
  baseline = 0,
  size = 120,
  strokeWidth = 8,
  children,
  accent = "amber",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const range = target - baseline;
  const pct = range > 0 ? Math.min(1, Math.max(0, (value - baseline) / range)) : 1;
  const offset = circumference * (1 - pct);
  const color = ACCENT_COLOR[accent] ?? ACCENT_COLOR.amber;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.3 0.02 285 / 0.5)"
          strokeWidth={strokeWidth}
        />
        {/* progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      {/* center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
