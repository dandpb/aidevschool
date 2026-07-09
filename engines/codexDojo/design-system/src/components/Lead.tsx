import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type LeadProps = ComponentPropsWithoutRef<"p">

/** Muted intro paragraph, max-width 680px. */
export function Lead({ className, children, ...rest }: LeadProps) {
  return (
    <p className={cx("lead", className)} {...rest}>
      {children}
    </p>
  )
}
