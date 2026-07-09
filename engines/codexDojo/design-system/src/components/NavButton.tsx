import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type NavButtonProps = {
  /** Marks the current view: brass left edge + emphasis. */
  active?: boolean
} & ComponentPropsWithoutRef<"button">

export function NavButton({ active, className, children, ...rest }: NavButtonProps) {
  return (
    <button
      type="button"
      className={cx("nav-button", active && "is-active", className)}
      aria-current={active ? "page" : undefined}
      {...rest}
    >
      {children}
    </button>
  )
}
