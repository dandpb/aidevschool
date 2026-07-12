/**
 * Zone placement primitives. `placeZone` is the single mutation entry point
 * for both single-cell clicks and the cells of a drag-placed block — the only
 * difference is whether they share a `blockId`.
 */

import type { Town } from "../scene/state"
import type { Grid } from "./grid"

export const ZONE_TYPES = ["residential", "shop", "workspace"] as const
export type ZoneType = (typeof ZONE_TYPES)[number]

export type PlaceResult =
  | { readonly kind: "placed"; readonly zoneId: string; readonly buildingId: string }
  | { readonly kind: "out-of-bounds" }
  | { readonly kind: "occupied" }

/**
 * Mark a grid cell as a zone of the given type, create the matching Zone and
 * Building records on `town`, and trigger a road recompute.
 *
 * The cell must currently be `grass` — placing on a road, an existing zone, or
 * out-of-bounds returns a non-`placed` result without mutating anything.
 */
export function placeZone(
  town: Town,
  grid: Grid,
  type: ZoneType,
  x: number,
  y: number,
  blockId: string | null = null,
): PlaceResult {
  if (!grid.inBounds(x, y)) return { kind: "out-of-bounds" }
  const cell = grid.cellAt(x, y)
  if (cell?.kind !== "grass") return { kind: "occupied" }

  const zone = town.addZone(type, x, y)
  grid.setCell(x, y, { kind: "zone", type, blockId })
  const building = town.addBuilding(zone.id, { x, y }, town.nextPaletteSeed())
  town.recomputeRoads()
  return { kind: "placed", zoneId: zone.id, buildingId: building.id }
}
