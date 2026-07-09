import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type EyebrowProps = ComponentPropsWithoutRef<"p">

/** Brass uppercase kicker above a heading. */
export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  return (
    <p className={cx("eyebrow", className)} {...rest}>
      {children}
    </p>
  )
}
