import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type PillProps = (
  | {
      /** Learning-unit state pill (brass by default, colored per tone). */
      variant: "state"
      tone?: "presenting" | "practicing" | "evaluating" | "mastered"
    }
  | {
      /** Gate pill: green "open" or red "blocked", tinted background. */
      variant: "gate"
      tone: "open" | "blocked"
    }
  | {
      /** Muted retry counter pill. */
      variant: "retry"
      tone?: never
    }
) &
  ComponentPropsWithoutRef<"span">

/** Uppercase status pill with a currentColor border. */
export function Pill({ variant, tone, className, children, ...rest }: PillProps) {
  return (
    <span className={cx(`${variant}-pill`, tone && `${variant}-${tone}`, className)} {...rest}>
      {children}
    </span>
  )
}
