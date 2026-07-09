import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type InlineLinkProps = ComponentPropsWithoutRef<"button">

/** Bare brass text button (link-style action inside prose or cards). */
export function InlineLink({ className, children, ...rest }: InlineLinkProps) {
  return (
    <button type="button" className={cx("inline-link", className)} {...rest}>
      {children}
    </button>
  )
}
