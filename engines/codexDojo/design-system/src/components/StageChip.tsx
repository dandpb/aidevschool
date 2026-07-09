import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type StageChipProps = {
  /** Small uppercase line above the label (e.g. the stage owner). */
  owner?: string
} & ComponentPropsWithoutRef<"button">

/** Clickable stage card: muted owner line + label. */
export function StageChip({ owner, className, children, ...rest }: StageChipProps) {
  return (
    <button type="button" className={cx("stage-chip", className)} {...rest}>
      {owner && <span>{owner}</span>}
      {children}
    </button>
  )
}
