import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type ActionButtonProps = {
  /** "primary" = solid brass (default); "secondary" = outlined. */
  variant?: "primary" | "secondary"
} & ComponentPropsWithoutRef<"button">

export function ActionButton({ variant = "primary", className, children, ...rest }: ActionButtonProps) {
  return (
    <button
      type="button"
      className={cx("action-button", variant === "secondary" && "secondary", className)}
      {...rest}
    >
      {children}
    </button>
  )
}
