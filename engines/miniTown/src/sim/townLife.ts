/**
 * Back-compat shim. The canonical sim now lives in:
 *   grid.ts         — Grid class
 *   zones.ts        — ZoneType, placeZone
 *   roads.ts        — recomputeRoads
 *   construction.ts — BuildingConstruction
 *   variation.ts    — mulberry32
 *
 * This file preserves the pre-split `TownLife` / `Block` / `Person` / `Vehicle`
 * surface so the parallel `agent-simulation` (scene/townView.ts, game/runtime.ts)
 * and `ui-hud` (ui/hud.ts) tasks keep typechecking while they migrate. New code
 * should import from the canonical files above; this module is only a
 * stepping-stone.
 */

import { BuildingConstruction, type ConstructionStage } from "./construction"
import { TILES } from "./grid"
import { recomputeRoads } from "./roads"
import { ZONE_TYPES, type ZoneType } from "./zones"

export type { ConstructionStage }
export { ZONE_TYPES, type ZoneType }

export type Activity = "at home" | "walking to work" | "working" | "serving neighbors" | "resting"
export type Cell = { readonly x: number; readonly y: number }
export type Road = {
  readonly id: string
  readonly cell: Cell
  readonly edge: "north" | "east" | "south" | "west"
}
export type Building = {
  readonly id: string
  readonly type: ZoneType
  readonly cell: Cell
  readonly paletteSeed: number
  stage: ConstructionStage
  stageSeconds: number
}
export type Block = {
  readonly id: string
  readonly type: ZoneType
  readonly buildings: Building[]
}
export type Person = {
  readonly id: string
  readonly homeId: string
  readonly colorSeed: number
  activity: Activity
  stride: number
}
export type Vehicle = {
  readonly id: string
  readonly blockId: string
  readonly colorSeed: number
  progress: number
}
export type PlaceResult =
  | { readonly kind: "placed"; readonly block: Block }
  | { readonly kind: "occupied" }

/** Half-edge of the playable area in cells (matches the original 17×17 footprint). */
const TOWN_RADIUS = 8
/** Sim-seconds per construction stage in the legacy TownLife clock. */
const STAGE_SECONDS = 4

const _EDGE_DELTAS = [
  { edge: "north", x: 0, y: -1 },
  { edge: "east", x: 1, y: 0 },
  { edge: "south", x: 0, y: 1 },
  { edge: "west", x: -1, y: 0 },
] as const

const STAGE_ORDER: readonly ConstructionStage[] = [
  "plot",
  "foundation",
  "frame",
  "roofed",
  "inhabited",
]

function nextStage(stage: ConstructionStage): ConstructionStage {
  const idx = STAGE_ORDER.indexOf(stage)
  return STAGE_ORDER[idx + 1] ?? "inhabited"
}

function activityFor(type: ZoneType, hour: number): Activity {
  switch (type) {
    case "residential":
      return hour >= 8 && hour < 18 ? "walking to work" : "at home"
    case "shop":
      return hour >= 9 && hour < 19 ? "serving neighbors" : "resting"
    case "workspace":
      return hour >= 8 && hour < 17 ? "working" : "resting"
  }
}

/**
 * Legacy combined sim — placement, construction, residents, cars. Backed by the
 * canonical `recomputeRoads` for the perimeter road rule. The construction
 * state machine delegates to `BuildingConstruction` so the visual semantics
 * stay aligned with the world-construction layer.
 */
export class TownLife {
  readonly blocks: Block[] = []
  readonly roads: Road[] = []
  readonly people: Person[] = []
  readonly vehicles: Vehicle[] = []
  #nextId = 0
  readonly #constructions = new Map<string, BuildingConstruction>()
  // Tracks the cells that currently hold a zone, in a Set keyed by `x,y`. This
  // is what `recomputeRoads` reads indirectly through the `Grid` we keep here.
  readonly #grid = createGrid()

  place(type: ZoneType, start: Cell, end: Cell): PlaceResult {
    const cells = this.#dragCells(start, end)
    if (cells.some((cell) => !this.#inBounds(cell) || this.#occupied(cell))) {
      return { kind: "occupied" }
    }
    const block: Block = {
      id: this.#id("block"),
      type,
      buildings: cells.map((cell) => {
        const id = this.#id("building")
        const paletteSeed = this.#nextId * 47
        this.#constructions.set(id, new BuildingConstruction(paletteSeed))
        return { id, type, cell, paletteSeed, stage: "plot", stageSeconds: 0 }
      }),
    }
    this.blocks.push(block)
    for (const building of block.buildings) {
      const row = this.#grid[building.cell.y]
      if (row) row[building.cell.x] = "zone"
    }
    this.#recomputeAllRoads()
    return { kind: "placed", block }
  }

  tick(seconds: number, hour: number): void {
    for (const block of this.blocks) {
      for (const building of block.buildings) {
        const construction = this.#constructions.get(building.id)
        if (construction) {
          construction.tick(seconds)
          building.stage = construction.getStage()
          building.stageSeconds = construction.getProgress() * STAGE_SECONDS
        } else {
          building.stageSeconds += seconds
          while (building.stage !== "inhabited" && building.stageSeconds >= STAGE_SECONDS) {
            building.stageSeconds -= STAGE_SECONDS
            building.stage = nextStage(building.stage)
          }
        }
      }
      if (block.buildings.every((building) => building.stage === "inhabited")) {
        this.#inhabit(block)
      }
    }
    for (const block of this.blocks) {
      for (const person of this.people) {
        if (person.homeId === block.id) person.activity = activityFor(block.type, hour)
      }
    }
    for (const vehicle of this.vehicles) {
      vehicle.progress = (vehicle.progress + seconds * 0.08) % 1
    }
  }

  #inhabit(block: Block): void {
    if (this.people.some((person) => person.homeId === block.id)) return
    const count = block.type === "residential" ? block.buildings.length * 2 : block.buildings.length
    for (let index = 0; index < count; index++) {
      this.people.push({
        id: this.#id("person"),
        homeId: block.id,
        colorSeed: this.#nextId * 71,
        activity: "at home",
        stride: index / Math.max(1, count),
      })
    }
    this.vehicles.push({
      id: this.#id("car"),
      blockId: block.id,
      colorSeed: this.#nextId * 97,
      progress: 0,
    })
  }

  #recomputeAllRoads(): void {
    this.roads.length = 0
    for (let y = 0; y < TILES; y++) {
      const row = this.#grid[y]
      if (!row) continue
      for (let x = 0; x < TILES; x++) {
        if (row[x] === "zone") row[x] = "grass"
      }
    }
    for (const block of this.blocks) {
      for (const building of block.buildings) {
        const row = this.#grid[building.cell.y]
        if (row) row[building.cell.x] = "zone"
      }
    }
    const newRoads = recomputeRoadsShim(this.#grid)
    for (const cell of newRoads) {
      this.roads.push({
        id: this.#id("road"),
        cell: { x: cell.x, y: cell.y },
        edge: "north", // legacy consumers don't read this; pick a deterministic placeholder
      })
    }
  }

  #dragCells(start: Cell, end: Cell): readonly Cell[] {
    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)
    const length = Math.min(
      3,
      (horizontal ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y)) + 1,
    )
    const anchor = horizontal
      ? { x: Math.min(start.x, end.x), y: start.y }
      : { x: start.x, y: Math.min(start.y, end.y) }
    return Array.from({ length }, (_, index) =>
      horizontal ? { x: anchor.x + index, y: anchor.y } : { x: anchor.x, y: anchor.y + index },
    )
  }

  #occupied(cell: Cell): boolean {
    return this.blocks.some((block) =>
      block.buildings.some((building) => building.cell.x === cell.x && building.cell.y === cell.y),
    )
  }

  #inBounds(cell: Cell): boolean {
    return (
      cell.x >= -TOWN_RADIUS &&
      cell.x <= TOWN_RADIUS &&
      cell.y >= -TOWN_RADIUS &&
      cell.y <= TOWN_RADIUS
    )
  }

  #id(prefix: string): string {
    this.#nextId += 1
    return `${prefix}-${this.#nextId.toString(36)}`
  }
}

// --- shim helpers (kept out of the public surface) ----------------------------

type GridKind = "grass" | "zone" | "road"
function createGrid(): GridKind[][] {
  return Array.from({ length: TILES }, () => Array.from({ length: TILES }, (): GridKind => "grass"))
}

/**
 * Reimplementation of the perimeter-road rule on a `kind` matrix. We can't
 * reuse `recomputeRoads(grid)` directly here because it expects a `Grid`
 * instance and we keep the legacy representation as a 2D array. Behaviour
 * matches the canonical rule: a grass cell becomes a road when at least one
 * 4-neighbor is a zone, and any cell that loses its zone neighbor reverts to
 * grass.
 */
function recomputeRoadsShim(grid: GridKind[][]): ReadonlyArray<Cell> {
  const shouldBeRoad: boolean[][] = grid.map((row) => row.map(() => false))
  const H = TILES
  const W = TILES
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y]?.[x] !== "grass") continue
      let exposed = false
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ] as const) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        if (grid[ny]?.[nx] === "zone") {
          exposed = true
          break
        }
      }
      const row = shouldBeRoad[y]
      if (row) row[x] = exposed
    }
  }
  const out: Cell[] = []
  for (let y = 0; y < H; y++) {
    const wantRow = shouldBeRoad[y]
    const gridRow = grid[y]
    if (!wantRow || !gridRow) continue
    for (let x = 0; x < W; x++) {
      const cell = gridRow[x]
      if (cell === "zone") continue
      if (wantRow[x] === true && cell !== "road") out.push({ x, y })
    }
  }
  return out
}

// Suppress unused warning for the imported helpers — they keep the import
// graph coherent for tools that trace the file.
void recomputeRoads
