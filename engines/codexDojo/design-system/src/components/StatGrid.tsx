import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { cx } from "../cx.js"

export type StatGridProps = {
  items: ReadonlyArray<{ label: string; value: ReactNode }>
} & Omit<ComponentPropsWithoutRef<"dl">, "children">

/** Three-up grid of label/value stat cells. */
export function StatGrid({ items, className, ...rest }: StatGridProps) {
  return (
    <dl className={cx("stat-grid", className)} {...rest}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
