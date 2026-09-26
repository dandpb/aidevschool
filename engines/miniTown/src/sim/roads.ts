/**
 * Recompute which cells of the grid are roads after a placement. A grass cell
 * becomes a road when at least one of its 4-neighbors is a zone — the zone is
 * "exposed" (not entirely surrounded by other zones in the same block). Cells
 * that are no longer adjacent to a zone revert to grass.
 *
 * Multi-cell block rule: a zone that has *all four* 4-neighbors in the same
 * blockId exposes none of them — its perimeter is interior to the block. A
 * zone with at least one non-zone (or different-blockId) neighbor exposes
 * each non-zone side.
 *
 * We snapshot the desired state in a boolean grid first, then apply the
 * changes in a second pass. This avoids the chicken-and-egg of "roads depend
 * on roads" if we tried to evaluate and write in a single sweep.
 */

import { type Grid, ROAD_NEIGHBOR_OFFSETS } from "./grid"

interface ZoneSnapshot {
  readonly type: string
  readonly blockId: string | null
}

function snapshotZonesFlat(grid: Grid): ReadonlyArray<ZoneSnapshot | null> {
  const arr = new Array<ZoneSnapshot | null>(grid.width * grid.height).fill(null)

  // Optimization: Use traditional loop instead of grid.forEach to avoid closure allocation
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cellAt(x, y)
      if (cell && cell.kind === "zone") {
        arr[y * grid.width + x] = { type: cell.type, blockId: cell.blockId }
      }
    }
  }
  return arr
}

/**
 * Walk the grid and rewrite road cells in place. Idempotent: calling it twice
 * in a row leaves the grid unchanged. Returns the number of cells that were
 * converted *to* road (useful for tests and HUD counts).
 */
export function recomputeRoads(grid: Grid): number {
  const zones = snapshotZonesFlat(grid)

  // Optimization: Flatten shouldBeRoad to a 1D array to improve memory locality and avoid 2D array allocations
  const shouldBeRoad = new Uint8Array(grid.width * grid.height)

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cellAt(x, y)
      if (cell?.kind === "zone" || cell === null) continue

      // Rule (a) — direct adjacency to an exposed zone.
      let matched = false
      // Optimization: Unroll for...of to avoid iterator allocation in this hot loop
      for (let i = 0; i < ROAD_NEIGHBOR_OFFSETS.length; i++) {
        const offset = ROAD_NEIGHBOR_OFFSETS[i]
        if (!offset) continue
        const nx = x + offset[0]
        const ny = y + offset[1]

        // Inline bounds check to skip grid.cellAt if possible
        if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue
        const neighbor = grid.cellAt(nx, ny)
        if (neighbor?.kind !== "zone") continue

        const zone = zones[ny * grid.width + nx]
        if (!zone) continue

        shouldBeRoad[y * grid.width + x] = 1
        matched = true
        break
      }
      if (matched) continue

      // Rule (b) — adjacent to an existing road *and* an exposed zone. This
      // is the propagation rule: it lets a road extend past a single zone's
      // direct neighbours when two zones share a road edge.
      let hasRoadNeighbor = false
      let hasExposedZone = false
      for (let i = 0; i < ROAD_NEIGHBOR_OFFSETS.length; i++) {
        const offset = ROAD_NEIGHBOR_OFFSETS[i]
        if (!offset) continue
        const nx = x + offset[0]
        const ny = y + offset[1]

        if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue
        const neighbor = grid.cellAt(nx, ny)
        if (!neighbor) continue
        if (neighbor.kind === "road") hasRoadNeighbor = true
        if (neighbor.kind === "zone") {
          const zone = zones[ny * grid.width + nx]
          if (zone) hasExposedZone = true
        }
      }
      if (hasRoadNeighbor && hasExposedZone) {
        shouldBeRoad[y * grid.width + x] = 1
      }
    }
  }

  // Apply — never overwrite a zone cell with a road.
  let convertedToRoad = 0
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cellAt(x, y)
      if (!cell || cell.kind === "zone") continue
      const wantRoad = shouldBeRoad[y * grid.width + x] === 1
      if (wantRoad) {
        if (cell.kind !== "road") {
          grid.setCell(x, y, { kind: "road" })
          convertedToRoad++
        }
      } else if (cell.kind === "road") {
        grid.setCell(x, y, { kind: "grass" })
      }
    }
  }
  return convertedToRoad
}
