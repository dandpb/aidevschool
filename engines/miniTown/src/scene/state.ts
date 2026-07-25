/**
 * Public world types. Kept as discriminated unions so future tasks can plug
 * richer shapes (e.g. multi-cell buildings, plot/foundation/frame/roofed/inhabited
 * stages) without breaking the Town API.
 *
 * This file is intentionally data-only: no THREE, no DOM. The simulation
 * engine doesn't care how a zone is rendered — only that it can be ticked.
 */

import { BuildingConstruction, type ConstructionStage, STAGE_SECONDS } from "../sim/construction"
import { Grid } from "../sim/grid"
import type { Cell } from "../sim/paths"
import { Resident as SimResident } from "../sim/residents"
import { recomputeRoads } from "../sim/roads"
import { Vehicle as SimVehicle } from "../sim/vehicles"
import type { DayNightSystem, DayPhase } from "./dayNight"

export type ZoneType = "residential" | "shop" | "workspace"

/** Grid cell in world units. The town grid is `TILES × TILES` centred at origin. */
export type { Cell }

export interface Zone {
  readonly id: string
  readonly type: ZoneType
  readonly cell: Cell
}

export interface Road {
  readonly id: string
  readonly cell: Cell
}

export type { ConstructionStage }

export interface Building {
  readonly id: string
  readonly zoneId: string
  readonly cell: Cell
  /** Wall + roof palette applied when the building transitions from `frame` to `roofed`. */
  readonly paletteSeed: number
  stage: ConstructionStage
  /** Sim seconds spent in the current stage. Other tasks use this to advance stages. */
  stageSeconds: number
}

/**
 * Convenience aliases: `town.residents[]` holds SIM-class instances (not a
 * data-only snapshot) so renderers and tests can read `currentCell`,
 * `currentActivity`, `path`, etc. directly. New code should import the
 * `Resident` / `Vehicle` types from `sim/residents` / `sim/vehicles` and treat
 * the arrays as the canonical sim state.
 */
export type Resident = SimResident
export type Vehicle = SimVehicle

/** Result of a `placeZone` call. */
export type PlaceZoneResult =
  | { readonly kind: "placed"; readonly zoneId: string; readonly buildingId: string }
  | { readonly kind: "out-of-bounds" }
  | { readonly kind: "occupied" }

/** Lightweight snapshot for the HUD / test contract. */
export interface WorldSnapshot {
  readonly simTime: number
  readonly phase: DayPhase
  readonly zoneCount: number
  readonly roadCount: number
  readonly buildingCount: number
  readonly residentCount: number
  readonly vehicleCount: number
  /** Number of buildings currently in or past the `roofed` stage. */
  readonly roofedCount: number
}

/**
 * The Town owns the sim clock and the canonical entity arrays. Other tasks
 * (zones, roads, buildings, residents, vehicles, traffic) push into it via
 * the `addX` methods and read it through the snapshot.
 *
 * Pure TypeScript: no THREE, no DOM. `tick(dt)` advances the day/night cycle,
 * the per-building construction state machine, and every resident/vehicle
 * path-marcher.
 */
export class Town {
  readonly zones: Zone[] = []
  readonly roads: Road[] = []
  readonly buildings: Building[] = []
  readonly residents: Resident[] = []
  readonly vehicles: Vehicle[] = []
  /** Fixed 20×20 grid of cells. Source of truth for what's grass / road / zone. */
  readonly grid: Grid = new Grid()
  /** One construction state machine per building, keyed by building id. */
  readonly constructions: Map<string, BuildingConstruction> = new Map()
  /** Per-instance counter — ids stay unique within a Town without any global state. */
  #idCounter = 0
  #paletteSeedCounter = 0
  /** Deterministic 32-bit PRNG used by spawn/sim layers for tie-breaking. */
  #rngState = 0x9e3779b9
  #listeners: Set<() => void> = new Set()

  constructor(public readonly dayNight: DayNightSystem) {}

  /** Deterministic, monotonically increasing palette seed (Knuth hash). */
  nextPaletteSeed(): number {
    this.#paletteSeedCounter += 1
    return (this.#paletteSeedCounter * 2654435761) | 0
  }

  /** Subscribe to *every* state change (addZone, placeZone, tick, ...). */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #notify(): void {
    for (const listener of this.#listeners) listener()
  }

  /**
   * Deterministic 32-bit PRNG — splitmix32. Spawners and sim classes ask for
   * `town.rng()` rather than calling `Math.random()` so test runs and
   * rendered sessions stay reproducible.
   */
  rng(): number {
    this.#rngState = (this.#rngState + 0x9e3779b9) >>> 0
    let z = this.#rngState
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296
  }

  /** Wall-clock sim time in hours — what the schedule reads to decide activity. */
  get currentSimTime(): number {
    return this.dayNight.simTime
  }

  addZone(type: ZoneType, x: number, y: number): Zone {
    this.#idCounter += 1
    const zone: Zone = { id: this.#id("z"), type, cell: { x, y } }
    this.zones.push(zone)
    return zone
  }

  addRoad(cell: Cell): Road {
    this.#idCounter += 1
    const road: Road = { id: this.#id("r"), cell }
    this.roads.push(road)
    return road
  }

  addBuilding(zoneId: string, cell: Cell, paletteSeed: number): Building {
    this.#idCounter += 1
    const building: Building = {
      id: this.#id("b"),
      zoneId,
      cell,
      paletteSeed,
      stage: "plot",
      stageSeconds: 0,
    }
    this.buildings.push(building)
    this.constructions.set(building.id, new BuildingConstruction(paletteSeed))
    return building
  }

  /**
   * Spawn a resident. The `homeCell` is where they start (and where the
   * renderer's mesh is placed each frame). `homeId`/`workId` are building
   * ids — `null` for unassigned. The Town always returns the SIM-class
   * instance it stored so callers can read live sim state.
   */
  addResident(homeId: string | null, workId: string | null, homeCell: Cell): Resident {
    this.#idCounter += 1
    const resident = new SimResident(this.#id("p"), homeId ?? "", workId, homeCell)
    this.residents.push(resident)
    return resident
  }

  /**
   * Spawn a vehicle. `startCell` must be a road cell — the traffic spawner
   * is responsible for picking one.
   */
  addVehicle(color: string, startCell: Cell): Vehicle {
    this.#idCounter += 1
    const vehicle = new SimVehicle(this.#id("v"), color, startCell)
    this.vehicles.push(vehicle)
    return vehicle
  }

  /** Read a zone by id. Used by the spawn layer to look up the zone kind. */
  findZoneById(id: string): Zone | null {
    return this.zones.find((z) => z.id === id) ?? null
  }

  /** Read a building by id — `homeId` / `workId` are passed in by residents. */
  findBuildingById(id: string | null): Building | null {
    if (!id) return null
    return this.buildings.find((b) => b.id === id) ?? null
  }

  /** Pick a random inhabited shop building. Drives resident shopping trips. */
  pickRandomShopId(): string | null {
    const shops = this.buildings.filter(
      (b) => b.stage === "inhabited" && this.findZoneById(b.zoneId)?.type === "shop",
    )
    if (shops.length === 0) return null
    const idx = Math.floor(this.rng() * shops.length)
    return shops[idx]?.id ?? null
  }

  /**
   * Pick the closest inhabited non-residential target for a car. Sorting by
   * Manhattan distance keeps traffic local without a global RNG roll —
   * small enough to evaluate every frame.
   */
  pickRandomTrafficTarget(near: Cell): { cell: Cell; buildingId: string } | null {
    const targets = this.buildings.filter(
      (b) => b.stage === "inhabited" && this.findZoneById(b.zoneId)?.type !== "residential",
    )
    if (targets.length === 0) return null
    // Stable sort by Manhattan distance — closest first. No RNG so the
    // result is deterministic for the same buildings set.
    const sorted = targets
      .slice()
      .sort(
        (a, b) =>
          Math.abs(a.cell.x - near.x) +
          Math.abs(a.cell.y - near.y) -
          (Math.abs(b.cell.x - near.x) + Math.abs(b.cell.y - near.y)),
      )
    const target = sorted[0]
    if (!target) return null
    return { cell: target.cell, buildingId: target.id }
  }

  /** True if any vehicle other than `excludeId` currently sits on `cell`. */
  isCellOccupiedByVehicle(cell: Cell, excludeId: string): boolean {
    for (const v of this.vehicles) {
      if (v.id === excludeId) continue
      if (v.currentCell.x === cell.x && v.currentCell.y === cell.y) return true
    }
    return false
  }

  /**
   * Validate → mark cell as zone → create building → recompute roads →
   * notify listeners. Roads are derived state — placing a zone on a road
   * cell overwrites the road. Only an existing `zone` cell returns
   * `occupied`. (blockId-based shared-block extension is preserved for
   * multi-cell drag placement.)
   */
  placeZone(type: ZoneType, x: number, y: number, blockId: string | null = null): PlaceZoneResult {
    if (!this.grid.inBounds(x, y)) return { kind: "out-of-bounds" }
    const cell = this.grid.cellAt(x, y)
    if (cell?.kind === "zone") return { kind: "occupied" }
    const zone = this.addZone(type, x, y)
    this.grid.setCell(x, y, { kind: "zone", type, blockId })
    const building = this.addBuilding(zone.id, { x, y }, this.nextPaletteSeed())
    this.recomputeRoads()
    this.#notify()
    return { kind: "placed", zoneId: zone.id, buildingId: building.id }
  }

  /**
   * Walk the grid and rewrite the `roads` array. Idempotent: calling it
   * twice in a row leaves `roads` unchanged.
   */
  recomputeRoads(): void {
    recomputeRoads(this.grid)
    this.roads.length = 0
    this.grid.forEach((cell, x, y) => {
      if (cell.kind !== "road") return
      this.#idCounter += 1
      this.roads.push({ id: this.#id("r"), cell: { x, y } })
    })
  }

  /** Advance the simulation by real `dt` seconds. Returns the snapshot AFTER the tick. */
  tick(dt: number): WorldSnapshot {
    this.dayNight.tick(dt)
    for (const building of this.buildings) {
      const construction = this.constructions.get(building.id)
      if (!construction) continue
      construction.tick(dt)
      const nextStage = construction.getStage()
      if (building.stage !== nextStage) building.stage = nextStage
      building.stageSeconds = construction.getProgress() * STAGE_SECONDS
    }
    // Ponytail: walks residents / drives cars each frame. Without this loop
    // the sim sits frozen even though the renderer animates the meshes.
    for (const resident of this.residents) resident.tick(dt, this)
    for (const vehicle of this.vehicles) vehicle.tick(dt, this)
    this.#notify()
    return this.snapshot()
  }

  /** Read-only view of the world for HUD / e2e contract. */
  snapshot(): WorldSnapshot {
    let roofedCount = 0
    for (const building of this.buildings) {
      if (building.stage === "roofed" || building.stage === "inhabited") roofedCount++
    }
    return {
      simTime: this.dayNight.simTime,
      phase: this.dayNight.phase,
      zoneCount: this.zones.length,
      roadCount: this.roads.length,
      buildingCount: this.buildings.length,
      residentCount: this.residents.length,
      vehicleCount: this.vehicles.length,
      roofedCount,
    }
  }

  #id(prefix: string): string {
    return `${prefix}-${this.#idCounter.toString(36)}`
  }
}
