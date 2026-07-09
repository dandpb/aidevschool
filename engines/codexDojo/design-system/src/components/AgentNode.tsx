import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type AgentNodeProps = ComponentPropsWithoutRef<"button">

/** Clickable node inside a Topology grid. */
export function AgentNode({ className, children, ...rest }: AgentNodeProps) {
  return (
    <button type="button" className={cx("agent-node", className)} {...rest}>
      <span>{children}</span>
    </button>
  )
}
