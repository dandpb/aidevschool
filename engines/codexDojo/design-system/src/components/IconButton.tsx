import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type IconButtonProps = ComponentPropsWithoutRef<"button">

/** Compact outlined button for glyphs/short labels. Min 44px hit area. */
export function IconButton({ className, children, ...rest }: IconButtonProps) {
  return (
    <button type="button" className={cx("icon-button", className)} {...rest}>
      {children}
    </button>
  )
}
