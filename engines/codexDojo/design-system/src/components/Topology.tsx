import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type TopologyProps = ComponentPropsWithoutRef<"article">

/** Agent-network grid with radial brass glow. Children are AgentNodes. */
export function Topology({ className, children, ...rest }: TopologyProps) {
  return (
    <article className={cx("topology", className)} {...rest}>
      {children}
    </article>
  )
}
