import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type FilterButtonProps = {
  /** Selected filter: mint border + tint. */
  active?: boolean
} & ComponentPropsWithoutRef<"button">

export function FilterButton({ active, className, children, ...rest }: FilterButtonProps) {
  return (
    <button
      type="button"
      className={cx("filter-button", active && "is-active", className)}
      aria-pressed={active ?? false}
      {...rest}
    >
      {children}
    </button>
  )
}
