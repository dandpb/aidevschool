/**
 * Public world types. Kept as discriminated unions so future tasks can plug
 * richer shapes (e.g. multi-cell buildings, plot/foundation/frame/roofed/inhabited
 * stages) without breaking the Town API.
 *
 * This file is intentionally data-only: no THREE, no DOM. The simulation
 * engine doesn't care how a zone is rendered — only that it can be ticked.
 */

import { BuildingConstruction, type ConstructionStage, STAGE_SECONDS } from "../sim/construction"
import { Grid, ROAD_NEIGHBOR_OFFSETS } from "../sim/grid"
import { recomputeRoads } from "../sim/roads"
import type { DayNightSystem, DayPhase } from "./dayNight"

export type ZoneType = "residential" | "shop" | "workspace"

/** Grid cell in world units. The town grid is `TILES × TILES` centred at origin. */
export interface Cell {
  readonly x: number
  readonly y: number
}

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

export interface Resident {
  readonly id: string
  readonly homeId: string | null
  readonly workId: string | null
  readonly colorSeed: number
}

export interface Vehicle {
  readonly id: string
  readonly colorSeed: number
}

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
 * Pure TypeScript: no THREE, no DOM. `tick(dt)` advances the day/night cycle
 * and the per-building construction state machine.
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

  addResident(homeId: string | null = null, workId: string | null = null): Resident {
    this.#idCounter += 1
    const resident: Resident = {
      id: this.#id("p"),
      homeId,
      workId,
      colorSeed: (this.#idCounter * 2654435761) | 0,
    }
    this.residents.push(resident)
    return resident
  }

  addVehicle(): Vehicle {
    this.#idCounter += 1
    const vehicle: Vehicle = {
      id: this.#id("v"),
      colorSeed: (this.#idCounter * 2654435761) | 0,
    }
    this.vehicles.push(vehicle)
    return vehicle
  }

  /**
   * Validate → mark cell as zone → create building → recompute roads →
   * notify listeners. Cells must currently be `grass`; otherwise the call
   * returns a non-`placed` result and the grid is untouched.
   */
  placeZone(type: ZoneType, x: number, y: number, blockId: string | null = null): PlaceZoneResult {
    if (!this.grid.inBounds(x, y)) return { kind: "out-of-bounds" }
    const cell = this.grid.cellAt(x, y)
    const extendsSharedBlock =
      blockId !== null &&
      cell?.kind === "road" &&
      ROAD_NEIGHBOR_OFFSETS.some(([dx, dy]) => {
        const neighbor = this.grid.cellAt(x + dx, y + dy)
        return neighbor?.kind === "zone" && neighbor.blockId === blockId
      })
    if (cell?.kind !== "grass" && !extendsSharedBlock) return { kind: "occupied" }
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
