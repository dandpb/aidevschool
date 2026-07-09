import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type NavStackProps = ComponentPropsWithoutRef<"nav">

/** Vertical nav container (horizontal on tablet/mobile). Children are NavButtons. */
export function NavStack({ className, children, ...rest }: NavStackProps) {
  return (
    <nav className={cx("nav-stack", className)} {...rest}>
      {children}
    </nav>
  )
}
