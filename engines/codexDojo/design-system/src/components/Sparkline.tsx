import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

const WIDTH = 100
const HEIGHT = 24

// Mirrors codexDojo src/render/sparkline.ts — keep in sync.
function sparklinePath(points: ReadonlyArray<number>): string {
  if (points.length === 0) return ""
  const stepX = points.length === 1 ? WIDTH : WIDTH / (points.length - 1)
  return points
    .map((value, index) => {
      const x = index * stepX
      const y = (1 - value) * HEIGHT
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}

export type SparklineProps = {
  /** Data points in [0, 1], left to right. */
  points: ReadonlyArray<number>
  /** Accessible label, e.g. "AIDI trendline". */
  label?: string
} & Omit<ComponentPropsWithoutRef<"svg">, "children" | "viewBox">

/** Compact brass trendline (100×24 viewBox). */
export function Sparkline({ points, label, className, ...rest }: SparklineProps) {
  const path = sparklinePath(points)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={cx("aidi-spark", className)} role="img" aria-label={label} {...rest}>
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} className="aidi-bg" rx="2" />
      {path && <path d={path} className="aidi-line" />}
    </svg>
  )
}
