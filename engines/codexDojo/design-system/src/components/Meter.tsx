import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type MeterProps = {
  /** Progress 0–100. */
  value: number
  /** Accessible label for the progressbar. */
  label?: string
} & Omit<ComponentPropsWithoutRef<"div">, "children">

/** Thin brass progress meter. */
export function Meter({ value, label, className, ...rest }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cx("meter", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  )
}
