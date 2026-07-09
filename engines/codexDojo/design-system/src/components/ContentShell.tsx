import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type ContentShellProps = ComponentPropsWithoutRef<"div">

/** Padded main-content area beside the Sidebar. */
export function ContentShell({ className, children, ...rest }: ContentShellProps) {
  return (
    <div className={cx("content-shell", className)} {...rest}>
      {children}
    </div>
  )
}
