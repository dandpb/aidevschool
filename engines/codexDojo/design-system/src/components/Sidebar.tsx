import type { ComponentPropsWithoutRef } from "react"
import { cx } from "../cx.js"

export type SidebarProps = {
  /** Short mark shown in the brass-bordered square, e.g. "CD". */
  brandMark?: string
  brandName?: string
  tagline?: string
} & ComponentPropsWithoutRef<"aside">

/** Sticky sidebar with optional brand block. Children are the nav (use NavStack). */
export function Sidebar({ brandMark, brandName, tagline, className, children, ...rest }: SidebarProps) {
  const hasBrand = brandMark || brandName
  return (
    <aside className={cx("sidebar", className)} {...rest}>
      {hasBrand && (
        <div className="brand-block">
          {brandMark && <span className="brand-mark">{brandMark}</span>}
          <div>
            {brandName && <strong>{brandName}</strong>}
            {tagline && <small>{tagline}</small>}
          </div>
        </div>
      )}
      {children}
    </aside>
  )
}
