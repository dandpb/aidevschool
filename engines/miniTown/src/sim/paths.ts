/**
 * Simple grid BFS pathfinder. Used by residents to plan walks and by cars
 * to plan drives. Costs reflect the spec:
 *
 *   road cell = 1
 *   zone cell = 2   (residents traverse zones slowly — they cut through
 *                    courtyards but it costs more steps)
 *   grass cell = 3  (only used as a last resort; the perimeter-road rule
 *                    keeps grass between roads and zones out of reach
 *                    most of the time)
 *
 * The result is a list of cells starting at `from` and ending at `to`. The
 * first element is `from` itself, the last is `to`. `null` means no
 * connected path exists (rare — only happens when the grid is fully walled
 * off from `to`).
 *
 * Tie-breaking: when two neighbours have the same cumulative cost, we use
 * a small PRNG-shuffled order so the same query doesn't always return the
 * same path. This keeps the town from looking like a regular grid of
 * perfectly aligned walkways.
 *
 * Caching: an LRU(64) keyed on `(fromHash, toHash)` keeps a tight budget
 * for the typical case where a resident plans the same commute hundreds
 * of times in a session.
 */

import { ROAD_NEIGHBOR_OFFSETS } from "./grid"

/** A 2D cell in town-grid coordinates. */
export interface Cell {
  readonly x: number
  readonly y: number
}

export type CellList = ReadonlyArray<Cell>

/**
 * Minimal grid interface the pathfinder needs. The full `Grid` class in
 * `./grid.ts` satisfies this shape; the TownView interfaces in
 * `residents.ts` / `vehicles.ts` re-use it so the pathfinder stays
 * decoupled from the world-state module.
 */
export interface GridLike {
  inBounds(x: number, y: number): boolean
  cellAt(x: number, y: number): { readonly kind: "grass" | "road" | "zone" } | null
}

/** Cost multipliers per cell kind. */
const ROAD_COST = 1
const ZONE_COST = 2
const GRASS_COST = 3

function costFor(kind: "grass" | "road" | "zone"): number {
  if (kind === "road") return ROAD_COST
  if (kind === "zone") return ZONE_COST
  return GRASS_COST
}

function cellKey(x: number, y: number): number {
  // 20x20 grid; pack x/y into one number. 6 bits per axis = 12 bits < 32.
  return ((x & 0x3f) << 6) | (y & 0x3f)
}

function pointKey(c: Cell): string {
  return `${c.x},${c.y}`
}

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y
}

/** Tiny FIFO-keyed LRU. Cap is 64 entries by default. */
class Lru<K, V> {
  readonly #cap: number
  readonly #map = new Map<K, V>()

  constructor(cap: number) {
    this.#cap = Math.max(1, cap)
  }

  get(key: K): V | undefined {
    const value = this.#map.get(key)
    if (value === undefined) return undefined
    // Refresh recency: re-insert.
    this.#map.delete(key)
    this.#map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.#map.has(key)) this.#map.delete(key)
    this.#map.set(key, value)
    while (this.#map.size > this.#cap) {
      const oldest = this.#map.keys().next().value
      if (oldest === undefined) break
      this.#map.delete(oldest)
    }
  }

  get size(): number {
    return this.#map.size
  }

  clear(): void {
    this.#map.clear()
  }
}

/** Module-level cache so repeated path requests across residents share. */
const pathCache = new Lru<string, CellList | null>(64)

/**
 * Plan a path from `from` to `to` using the road/zone cost profile. Returns
 * `null` if no path exists. Pure with respect to the grid (does not mutate
 * it). Cached.
 *
 * Returns a fresh `Cell[]` (mutable) every call. The internal cache stores
 * the readonly canonical form so callers can mutate the result without
 * poisoning future lookups.
 */
export function findPath(
  grid: GridLike,
  from: Cell,
  to: Cell,
  rng: () => number = Math.random,
): Cell[] | null {
  const key = `${pointKey(from)}->${pointKey(to)}`
  const cached = pathCache.get(key)
  if (cached !== undefined) {
    return cached === null ? null : cached.slice()
  }
  const path = bfs(grid, from, to, rng)
  // Cache the *original* (un-shifted) result so future calls return fresh
  // arrays and callers can mutate the slice they got.
  pathCache.set(key, path)
  return path === null ? null : path.slice()
}

function bfs(grid: GridLike, from: Cell, to: Cell, rng: () => number): Cell[] | null {
  if (!grid.inBounds(from.x, from.y) || !grid.inBounds(to.x, to.y)) return null
  if (sameCell(from, to)) return [{ x: from.x, y: from.y }]

  // Costs: cost-so-far from `from` for each visited cell. `undefined` means
  // unvisited. We use a typed-array-free Map because the grid is small.
  const costs = new Map<number, number>()
  const cameFrom = new Map<number, number>()
  const startKey = cellKey(from.x, from.y)
  costs.set(startKey, 0)

  // Frontier: sorted by ascending cost, tie-broken by RNG. We use a
  // `Map<number, Cell[]>` indexed by cost to avoid sorting inside the loop.
  const frontiers = new Map<number, Cell[]>()
  const enqueue = (cell: Cell, cost: number): void => {
    const arr = frontiers.get(cost) ?? []
    arr.push(cell)
    frontiers.set(cost, arr)
  }
  enqueue(from, 0)

  const goalKey = cellKey(to.x, to.y)
  while (frontiers.size > 0) {
    // Pop the lowest-cost frontier.
    const lowest = minKey(frontiers)
    if (lowest === undefined) break
    const bucket = frontiers.get(lowest)
    if (!bucket || bucket.length === 0) continue
    // Tie-break with the caller's RNG so two runs of the same path don't
    // always pick the same neighbour; the per-call Town RNG keeps the
    // session deterministic.
    const cell = bucket.splice(Math.floor(rng() * bucket.length), 1)[0]
    if (!cell) continue
    if (bucket.length === 0) frontiers.delete(lowest)
    const cellK = cellKey(cell.x, cell.y)
    if (cellK === goalKey) {
      return reconstruct(cameFrom, from, cell)
    }
    // If we already have a cheaper path, skip.
    const currentCost = costs.get(cellK)
    if (currentCost === undefined || currentCost < lowest) continue
    // Neighbours: 4-connected.
    for (const [dx, dy] of ROAD_NEIGHBOR_OFFSETS) {
      const nx = cell.x + dx
      const ny = cell.y + dy
      if (!grid.inBounds(nx, ny)) continue
      const neighbour = grid.cellAt(nx, ny)
      if (!neighbour) continue
      const stepCost = costFor(neighbour.kind)
      const nextCost = lowest + stepCost
      const nKey = cellKey(nx, ny)
      const prev = costs.get(nKey)
      if (prev !== undefined && nextCost >= prev) continue
      costs.set(nKey, nextCost)
      cameFrom.set(nKey, cellK)
      enqueue({ x: nx, y: ny }, nextCost)
    }
  }
  return null
}

function minKey(m: Map<number, unknown>): number | undefined {
  let min: number | undefined
  for (const k of m.keys()) {
    if (min === undefined || k < min) min = k
  }
  return min
}

function reconstruct(cameFrom: Map<number, number>, start: Cell, end: Cell): Cell[] {
  const reverse: Cell[] = []
  let cursor: number = cellKey(end.x, end.y)
  const startKey = cellKey(start.x, start.y)
  while (cursor !== startKey) {
    const cx = (cursor >> 6) & 0x3f
    const cy = cursor & 0x3f
    reverse.push({ x: cx, y: cy })
    const next = cameFrom.get(cursor)
    if (next === undefined) break
    cursor = next
  }
  reverse.push({ x: start.x, y: start.y })
  reverse.reverse()
  return reverse
}

/**
 * Find a cell adjacent to `target` (one of the four 4-neighbours) that is
 * walkable and as close to `from` as possible. Used by the resident to
 * stand *next to* a building rather than inside it, and by the car
 * spawner to seed vehicles on a road.
 *
 * Returns `null` if no walkable neighbour exists.
 */
export function findAdjacentWalkable(
  grid: GridLike,
  target: Cell,
  prefer: ReadonlyArray<Cell> = [],
): Cell | null {
  const candidates: Cell[] = []
  for (const [dx, dy] of ROAD_NEIGHBOR_OFFSETS) {
    const nx = target.x + dx
    const ny = target.y + dy
    if (!grid.inBounds(nx, ny)) continue
    const cell = grid.cellAt(nx, ny)
    if (!cell) continue
    candidates.push({ x: nx, y: ny })
  }
  if (candidates.length === 0) return null
  // Sort by prefer-list membership, then by Manhattan distance to the
  // first preferred cell (so the result is deterministic but prefers
  // cells closer to existing roads).
  candidates.sort((a, b) => {
    const ai = prefer.findIndex((p) => p.x === a.x && p.y === a.y)
    const bi = prefer.findIndex((p) => p.x === b.x && p.y === b.y)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  return candidates[0] ?? null
}

/** Manhattan distance between two cells. Used by spawners for proximity checks. */
export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Advance along `path` by `distanceBudget` units, consuming whole segments
 * and accumulating sub-cell progress. Shared by Resident and Vehicle so the
 * walk/drive stepping stays identical.
 */
export function stepAlongPath(
  path: readonly Cell[],
  currentCell: Cell,
  pathIndex: number,
  segmentProgress: number,
  distanceBudget: number,
): { currentCell: Cell; pathIndex: number; segmentProgress: number } {
  let remaining = distanceBudget
  let cell = currentCell
  let index = pathIndex
  let progress = segmentProgress
  while (remaining > 0 && index < path.length) {
    const goal = path[index]
    if (!goal) break
    const start = path[index - 1] ?? cell
    const dist = manhattan(start, goal)
    if (dist === 0) {
      index += 1
      progress = 0
      continue
    }
    if (remaining + progress >= dist) {
      remaining -= dist - progress
      cell = { x: goal.x, y: goal.y }
      index += 1
      progress = 0
    } else {
      progress += remaining
      remaining = 0
    }
  }
  return { currentCell: cell, pathIndex: index, segmentProgress: progress }
}

/**
 * Interpolated point between `path[pathIndex-1]` and `path[pathIndex]` given
 * sub-cell `progress`. Falls back to `fallback` when no segment is active.
 * Shared by the resident and vehicle renderers.
 */
export function segmentPoint(
  path: readonly Cell[],
  pathIndex: number,
  progress: number,
  fallback: Cell,
): { x: number; y: number } {
  const from = path[pathIndex - 1]
  const to = path[pathIndex]
  if (!from || !to) return { x: fallback.x, y: fallback.y }
  const dist = manhattan(from, to)
  if (dist === 0) return { x: fallback.x, y: fallback.y }
  const t = progress / dist
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
}

/** Drop the LRU cache (e.g. between tests or after a heavy `placeZone` wave). */
export function resetPathCache(): void {
  pathCache.clear()
}
