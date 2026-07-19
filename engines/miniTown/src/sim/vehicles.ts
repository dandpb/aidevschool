/**
 * The Vehicle sim class. One instance per car. The Town holds them in
 * `town.vehicles` and calls `tick(dt, town)` once per simulation step.
 *
 * The class mirrors `Resident` but:
 *   - speed is 4 units/sec (cars are ~2.7× faster than pedestrians),
 *   - movement is restricted to road cells (the pathfinder enforces this
 *     by returning `null` for non-road-only paths — see `findPath`),
 *   - a small car-following heuristic slows a car when the next cell on
 *     its path is already occupied by another car,
 *   - on arrival, a new destination is sampled from the inhabited shop /
 *     workspace cells.
 *
 * The path data is stored as a list of cells with a sub-cell
 * `segmentProgress` accumulator. The renderer reads `currentCell` and
 * `path` to position and orient the mesh; the spec says the car should
 * rotate "alinhada com a direção do path", which we implement by
 * computing the heading from `path[pathIndex] - path[pathIndex-1]`.
 */

import { type Cell, findPath, type GridLike, stepAlongPath } from "./paths"

const CAR_SPEED = 4 // units per second

export class Vehicle {
  readonly id: string
  readonly color: string
  currentCell: Cell
  /** Cells from `currentCell` (inclusive) to destination (inclusive). */
  path: readonly Cell[] = []
  pathIndex = 0
  /** Sub-cell progress from `path[pathIndex-1]` to `path[pathIndex]`. */
  progressAlongSegment = 0
  /** Units per second at the head of the path. Halved in traffic. */
  speed = CAR_SPEED
  /** Optional id of a building the car is heading to (used by the renderer
   *  to set a destination marker; also kept so future tasks can read it). */
  destinationBuildingId: string | null = null

  /**
   * @param id Stable id.
   * @param color Car paint (one of 4 variants — see `traffic.ts`).
   * @param startCell Initial road cell. The Town should seed vehicles on
   *   road cells only.
   */
  constructor(id: string, color: string, startCell: Cell) {
    this.id = id
    this.color = color
    this.currentCell = { x: startCell.x, y: startCell.y }
  }

  /**
   * Advance by one frame. Reads the Town to (a) detect traffic on the next
   * path cell, (b) pick a new destination on arrival.
   */
  tick(dt: number, town: TownView): void {
    if (!(dt > 0)) return
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.#chooseNewDestination(town)
    }
    if (this.path.length === 0) return
    // Car-following: peek the cell we're heading to and slow if occupied.
    const ahead = this.path[this.pathIndex]
    if (ahead && town.isCellOccupiedByVehicle(ahead, this.id)) {
      this.speed = CAR_SPEED * 0.35
    } else {
      this.speed = CAR_SPEED
    }
    const step = stepAlongPath(
      this.path,
      this.currentCell,
      this.pathIndex,
      this.progressAlongSegment,
      dt * this.speed,
    )
    this.currentCell = step.currentCell
    this.pathIndex = step.pathIndex
    this.progressAlongSegment = step.segmentProgress
    if (this.pathIndex >= this.path.length) {
      // Arrived. The next tick will pick a new destination.
      this.destinationBuildingId = null
    }
  }

  /**
   * Heading unit vector from `currentCell` to the next path waypoint. The
   * renderer uses this to yaw the car body. Returns `null` if no heading
   * is known yet (no path, or the car is at the last waypoint).
   */
  heading(): { x: number; y: number } | null {
    if (this.path.length === 0) return null
    const target = this.path[this.pathIndex] ?? this.path[this.path.length - 1]
    if (!target) return null
    const dx = target.x - this.currentCell.x
    const dy = target.y - this.currentCell.y
    if (dx === 0 && dy === 0) return null
    return { x: dx, y: dy }
  }

  #chooseNewDestination(town: TownView): void {
    const target = town.pickRandomTrafficTarget(this.currentCell, this.id)
    const path = target ? findPath(town.grid, this.currentCell, target.cell, town.rng) : null
    if (!target || !path || path.length === 0) {
      this.path = []
      this.pathIndex = 0
      this.progressAlongSegment = 0
      this.destinationBuildingId = null
      return
    }
    this.path = path
    this.pathIndex = path.length > 1 ? 1 : 0
    this.progressAlongSegment = 0
    this.destinationBuildingId = target.buildingId
  }
}

/** Subset of the Town the Vehicle needs to read. */
export interface TownView {
  readonly grid: GridLike
  rng(): number
  isCellOccupiedByVehicle(cell: Cell, excludeId: string): boolean
  pickRandomTrafficTarget(near: Cell, excludeId: string): { cell: Cell; buildingId: string } | null
}
