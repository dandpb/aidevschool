import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type SectionHeadingProps = ComponentPropsWithoutRef<"div">

/** Constrained-width block for a view's heading (h2 + intro paragraph). */
export function SectionHeading({ className, children, ...rest }: SectionHeadingProps) {
  return (
    <div className={cx("section-heading", className)} {...rest}>
      {children}
    </div>
  )
}
