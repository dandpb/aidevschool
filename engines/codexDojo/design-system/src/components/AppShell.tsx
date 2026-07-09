import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type AppShellProps = ComponentPropsWithoutRef<"main">

/** Root layout: fixed-width sidebar + fluid content. Compose with Sidebar and ContentShell. */
export function AppShell({ className, children, ...rest }: AppShellProps) {
  return (
    <main className={cx("app-shell", className)} {...rest}>
      {children}
    </main>
  )
}
