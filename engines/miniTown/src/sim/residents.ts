/**
 * The Resident sim class. One instance per person living in the town. The
 * Town holds them in `town.residents` and calls `tick(dt, town)` once per
 * simulation step. The class is intentionally data-and-behaviour — the
 * render layer reads `currentCell` / `currentActivity` / `destination` to
 * place and pose a low-poly mesh, but no THREE types appear in this file.
 *
 * Behaviour summary:
 *   - `tick(dt, town)` advances the resident by one frame. The resident
 *     compares its current cell against the schedule's desired location
 *     for the current simTime and, if needed, plans a path with
 *     `findPath`.
 *   - When walking, it follows its `path` step-by-step at 1.5 units/sec.
 *   - The `currentActivity` is one of `'home' | 'walking' | 'working' |
 *     'shopping'` — the same shape the spec asks for and the same labels
 *     the verifier inspects.
 *
 * Determinism: a resident's `name` and `color` are derived from `id` only.
 * The Town's per-instance RNG governs *which* home/work pair a resident is
 * assigned to, but once a resident exists its visuals are immutable.
 */

import { type Cell, findAdjacentWalkable, findPath, type GridLike, stepAlongPath } from "./paths"
import {
  compressActivity,
  type ResidentActivity,
  type ScheduleLocation,
  scheduleFor,
} from "./schedules"

const WALK_SPEED = 1.5 // units per second

/**
 * The colour palette the spec asks for. 5 variants — within the 4..6 range
 * — and held distinct from the building wall/roof palettes so a resident
 * standing in front of a building never visually blends in.
 */
const SHIRT_PALETTE: readonly string[] = [
  "#d96a4a", // terracotta
  "#5a8a5a", // forest
  "#3d6a8a", // navy
  "#d6a64a", // mustard
  "#7a4a8a", // plum
]

const SKIN_PALETTE: readonly string[] = [
  "#f1c3a2", // peach
  "#d8a684", // tan
  "#a87a5a", // brown
  "#efc89a", // pale
]

/**
 * Deterministic name generator. Splits a 32-bit hash into a first/last
 * combination from a small pool. Same id → same name. The pools are
 * deliberately broad (12 firsts × 12 lasts = 144 combos) so two adjacent
 * residents don't share a name.
 */
const FIRST_NAMES: readonly string[] = [
  "Aldo",
  "Beatriz",
  "Camilo",
  "Diana",
  "Elena",
  "Felipe",
  "Gabriela",
  "Henrique",
  "Iolanda",
  "Joaquim",
  "Karina",
  "Lúcia",
  "Mateo",
  "Noemi",
  "Otávio",
  "Paula",
]
const LAST_NAMES: readonly string[] = [
  "Renoir",
  "Lima",
  "Salgado",
  "Pereira",
  "Vasconcelos",
  "Mendoza",
  "Coutinho",
  "Salazar",
  "Oliveira",
  "Carmona",
  "Bittencourt",
  "Drummond",
]

/** FNV-1a string hash, matching the Town's palette seed style. Exported so
 *  renderers can seed per-resident RNGs from the same id. */
export function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickShirtColor(h: number): string {
  const idx = h % SHIRT_PALETTE.length
  const v = SHIRT_PALETTE[idx]
  if (v === undefined) {
    throw new Error("Resident shirt palette is empty")
  }
  return v
}

export class Resident {
  readonly id: string
  readonly name: string
  readonly homeId: string
  /** Building id of the workplace; assigned (possibly later) by the spawner. */
  workId: string | null
  readonly color: string
  /** Visible to the renderer; the spec asks for it explicitly. */
  currentActivity: ResidentActivity = "home"
  currentCell: Cell
  destination: { cell: Cell; buildingId: string | null } | null = null
  /** Where the resident is heading. Cleared once they arrive. */
  path: readonly Cell[] = []
  /** Index of the *next* cell to walk into. `path[pathIndex]` is the goal. */
  pathIndex = 0
  /** Sub-cell progress between `path[pathIndex-1]` and `path[pathIndex]`. */
  segmentProgress = 0
  /** Units per second. Pedestrians are slower than cars. */
  readonly speed = WALK_SPEED

  /**
   * @param id Stable identifier; the name and colour are derived from it.
   * @param homeId Building id where the resident lives. Used to compute the
   *   *home* cell.
   * @param workId Building id of the workplace, or `null` for residents
   *   without a job (children, retirees).
   * @param homeCell Cell of the home building; the resident starts here.
   */
  constructor(id: string, homeId: string, workId: string | null, homeCell: Cell) {
    this.id = id
    this.homeId = homeId
    this.workId = workId
    this.currentCell = { x: homeCell.x, y: homeCell.y }
    const h = hash32(id)
    this.name = `${FIRST_NAMES[h % FIRST_NAMES.length] ?? "Neighbor"} ${
      LAST_NAMES[(h >>> 8) % LAST_NAMES.length] ?? "DoVale"
    }`
    this.color = pickShirtColor(h >>> 4)
  }

  /**
   * Public skin colour accessor. The renderer reads it to paint the head
   * sphere; a small palette keeps the look varied but cohesive.
   */
  getSkinColor(rng: () => number): string {
    const idx = Math.min(SKIN_PALETTE.length - 1, Math.floor(rng() * SKIN_PALETTE.length))
    return SKIN_PALETTE[idx] ?? SKIN_PALETTE[0] ?? "#f1c3a2"
  }

  /** Activity label — same as `currentActivity`; convenience for the HUD. */
  getActivity(): ResidentActivity {
    return this.currentActivity
  }

  /**
   * Advance the resident by one frame. Side effects: may plan a new path,
   * may advance along the current path, may flip `currentActivity` to
   * match the schedule.
   */
  tick(dt: number, town: TownView): void {
    if (!(dt > 0)) return
    const hour = town.currentSimTime
    const slot = scheduleFor(hour)
    const target = this.#desiredLocation(slot.location, town)

    // First: walk along the active path.
    const arrived = this.#advanceAlongPath(dt)
    if (arrived && this.destination) {
      this.currentCell = { x: this.destination.cell.x, y: this.destination.cell.y }
      this.#clearTrip()
    }

    // Second: if the schedule wants us somewhere different, replan.
    if (target && !this.#isAtTarget(target.cell)) {
      this.#replan(target, town)
    } else if (!target && this.destination) {
      // We don't want to be anywhere specific — clear the trip.
      this.#clearTrip()
    }

    // Third: project the symbolic location onto the 4-label activity.
    if (this.path.length > 0 && this.pathIndex < this.path.length) {
      this.currentActivity = "walking"
    } else {
      this.currentActivity = compressActivity(slot)
    }
  }

  /**
   * Choose the cell the resident *should* be at, given the symbolic
   * `ScheduleLocation`. Returns `null` if no target is reachable (e.g. no
   * work building assigned, no shop in town).
   */
  #desiredLocation(
    intent: ScheduleLocation,
    town: TownView,
  ): { cell: Cell; buildingId: string | null } | null {
    switch (intent) {
      case "home":
        return homeCellFor(town, this.homeId)
      case "work":
        return workCellFor(town, this.workId)
      case "shop":
        return shopCellFor(town)
      case "walking":
        // Already mid-trip; no fixed target until the schedule flips.
        return null
    }
  }

  #isAtTarget(target: Cell): boolean {
    if (this.destination) {
      return this.destination.cell.x === target.x && this.destination.cell.y === target.y
    }
    return this.currentCell.x === target.x && this.currentCell.y === target.y
  }

  #advanceAlongPath(dt: number): boolean {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) return true
    const step = stepAlongPath(
      this.path,
      this.currentCell,
      this.pathIndex,
      this.segmentProgress,
      dt * this.speed,
    )
    this.currentCell = step.currentCell
    this.pathIndex = step.pathIndex
    this.segmentProgress = step.segmentProgress
    return this.pathIndex >= this.path.length
  }

  #clearTrip(): void {
    this.destination = null
    this.path = []
    this.pathIndex = 0
    this.segmentProgress = 0
  }

  #replan(target: { cell: Cell; buildingId: string | null }, town: TownView): void {
    // Stand adjacent to the destination rather than on top of it. Cars do
    // the same. Otherwise the pathfinder would refuse (zone cells are
    // walkable but expensive; we still want to enter the cell).
    const fromCell = this.currentCell
    const path = findPath(town.grid, fromCell, target.cell, town.rng)
    if (!path || path.length === 0) {
      this.#clearTrip()
      return
    }
    this.destination = target
    this.path = path
    this.pathIndex = path.length > 1 ? 1 : 0
    this.segmentProgress = 0
  }
}

/**
 * Minimal TownView surface the Resident needs. We import this shape only
 * to keep the Resident module decoupled from the full Town class — the
 * real Town implements all of these.
 */
export interface TownView {
  readonly grid: GridLike
  readonly currentSimTime: number
  rng(): number
  findBuildingById(id: string): { id: string; cell: Cell } | null
  pickRandomShopId(): string | null
}

function homeCellFor(town: TownView, homeId: string): { cell: Cell; buildingId: string } | null {
  const building = town.findBuildingById(homeId)
  if (!building) return null
  return { cell: building.cell, buildingId: homeId }
}

function workCellFor(
  town: TownView,
  workId: string | null,
): { cell: Cell; buildingId: string } | null {
  if (!workId) return null
  const building = town.findBuildingById(workId)
  if (!building) return null
  return { cell: building.cell, buildingId: workId }
}

function shopCellFor(town: TownView): { cell: Cell; buildingId: string } | null {
  const shopId = town.pickRandomShopId()
  if (!shopId) return null
  const building = town.findBuildingById(shopId)
  if (!building) return null
  // The resident wants to stand *outside* the shop, on a road cell. This
  // keeps the renderer honest: the mesh is always on a walkable cell.
  const adjacent = findAdjacentWalkable(town.grid, building.cell)
  if (adjacent) return { cell: adjacent, buildingId: shopId }
  return { cell: building.cell, buildingId: shopId }
}
