/**
 * The town grid: a fixed 20×20 cell field centred at the world origin. Cells
 * carry an occupant discriminator — grass (default), road, or zone (with a
 * sub-type and an optional `blockId` shared by all cells in a multi-cell
 * drag-placement). The grid is intentionally data-only: it doesn't know about
 * Three.js, the Town, or any other module; the scene layer reads from it to
 * place meshes.
 */

import type { ZoneType } from "../scene/state"

/** Edge length of the town in cells. Matches `Ground.TILES`. */
export const TILES = 20

export interface GrassCell {
  readonly kind: "grass"
}

export interface RoadCell {
  readonly kind: "road"
}

export interface ZoneCell {
  readonly kind: "zone"
  readonly type: ZoneType
  /**
   * Identifier shared by all cells in the same multi-cell block. `null` for
   * single-cell placements. `recomputeRoads` uses it (indirectly) to keep
   * interior cells of a block free of road neighbours.
   */
  readonly blockId: string | null
}

export type CellOccupant = GrassCell | RoadCell | ZoneCell

export const GRASS: CellOccupant = { kind: "grass" } as const

/**
 * 2D cell grid. The internal array is row-major (`#cells[y][x]`). `inBounds`
 * accepts integers only — non-integer values are rejected so a misplaced
 * `placeZone(..., 0.5, 0.5)` cannot silently round into a valid cell.
 */
export class Grid {
  readonly width: number = TILES
  readonly height: number = TILES
  readonly #cells: CellOccupant[][]

  constructor() {
    this.#cells = Array.from({ length: TILES }, () =>
      Array.from({ length: TILES }, (): CellOccupant => ({ kind: "grass" })),
    )
  }

  inBounds(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < this.width &&
      y >= 0 &&
      y < this.height
    )
  }

  cellAt(x: number, y: number): CellOccupant | null {
    if (!this.inBounds(x, y)) return null
    const row = this.#cells[y]
    if (!row) return null
    return row[x] ?? null
  }

  /** Throws on out-of-bounds so callers can rely on a no-op-free write. */
  setCell(x: number, y: number, occupant: CellOccupant): void {
    if (!this.inBounds(x, y)) {
      throw new Error(`Grid.setCell: (${x}, ${y}) is out of bounds`)
    }
    const row = this.#cells[y]
    if (!row) throw new Error(`Grid.setCell: missing row ${y}`)
    row[x] = occupant
  }

  forEach(callback: (occupant: CellOccupant, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y++) {
      const row = this.#cells[y]
      if (!row) continue
      for (let x = 0; x < this.width; x++) {
        const occupant = row[x]
        if (occupant) callback(occupant, x, y)
      }
    }
  }

  countWhere(predicate: (occupant: CellOccupant) => boolean): number {
    let n = 0
    this.forEach((o) => {
      if (predicate(o)) n++
    })
    return n
  }
}

/** 4-connected neighbour offsets used by the road rule. */
export const ROAD_NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // north
  [1, 0], // east
  [0, 1], // south
  [-1, 0], // west
]
