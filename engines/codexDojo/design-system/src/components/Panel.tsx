import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type PanelProps = {
  /** Hero variant: tall, generously padded, vertically centered (the command panel). */
  hero?: boolean
} & ComponentPropsWithoutRef<"article">

/** Border-only-depth surface. The base of every card in the system. */
export function Panel({ hero, className, children, ...rest }: PanelProps) {
  return (
    <article className={cx(hero ? "command-panel" : "panel", className)} {...rest}>
      {children}
    </article>
  )
}
