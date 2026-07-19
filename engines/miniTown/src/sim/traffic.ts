/**
 * Vehicle population. Called by the Town's late-inhabit hook (and via
 * `spawnVehiclesForTown` on demand) to populate the town with cars.
 *
 * Caps:
 *   - Up to MAX_VEHICLES (default 20 — matches the spec).
 *   - 1 car per 3 residents (rounded up), so a town with 9 residents
 *     gets 3 cars, 10 residents get 4 cars, etc.
 *   - 4 car colours, distributed round-robin.
 *
 * Initial seed: each car is placed on a road cell chosen by sampling
 * inhabited shop / workspace cells and parking the car on the closest
 * road neighbour. Cars then immediately plan their first trip from there.
 *
 * Determinism: the Town's per-instance RNG governs all rolls. The same
 * sequence of `placeZone` calls in the same order yields the same fleet.
 */

import type { Town } from "../scene/state"
import { findAdjacentWalkable } from "./paths"
import { Vehicle } from "./vehicles"

/** Performance cap from the spec. */
export const MAX_VEHICLES = 20
/** Car paint palette. 4 variants per the spec. */
const CAR_COLORS: readonly string[] = [
  "#c0524a", // terracotta
  "#3d6a8a", // navy
  "#d6a64a", // mustard
  "#e8e6dc", // white
]

/**
 * Idempotent population pass. Walks the inhabited shop / workspace cells,
 * picks road-adjacent starting cells, and appends vehicles until the cap
 * is hit. Vehicles without a road-adjacent seed cell are skipped.
 */
export function spawnVehiclesForTown(town: Town): void {
  if (town.vehicles.length >= MAX_VEHICLES) return
  const residentCount = town.residents.length
  const target = Math.min(MAX_VEHICLES, Math.ceil(residentCount / 3))
  if (target <= town.vehicles.length) return
  // Find seed cells: a road cell adjacent to an inhabited shop/workspace.
  const seeds: { cell: { x: number; y: number }; buildingId: string }[] = []
  for (const building of town.buildings) {
    if (building.stage !== "inhabited") continue
    const zone = town.findZoneById(building.zoneId)
    if (!zone) continue
    if (zone.type !== "shop" && zone.type !== "workspace") continue
    const adjacent = findAdjacentWalkable(town.grid, building.cell)
    if (!adjacent) continue
    const cell = town.grid.cellAt(adjacent.x, adjacent.y)
    if (cell?.kind !== "road") continue
    seeds.push({ cell: adjacent, buildingId: building.id })
  }
  if (seeds.length === 0) return
  // Round-robin colour selection.
  const needed = target - town.vehicles.length
  let seedIndex = Math.floor(town.rng() * seeds.length)
  for (let i = 0; i < needed; i++) {
    if (town.vehicles.length >= MAX_VEHICLES) return
    const seed = seeds[seedIndex % seeds.length]
    if (!seed) return
    seedIndex += 1
    const id = `v-${town.vehicles.length + 1}`
    const colorIdx = town.vehicles.length % CAR_COLORS.length
    const color = CAR_COLORS[colorIdx] ?? CAR_COLORS[0] ?? "#c0524a"
    const vehicle = new Vehicle(id, color, seed.cell)
    town.addVehicle(vehicle)
  }
}

/** Exported so the Town can re-use the palette for the renderer. */
export function carColors(): readonly string[] {
  return CAR_COLORS
}
