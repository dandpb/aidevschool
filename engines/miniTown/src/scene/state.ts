/**
 * Public world types. Kept as discriminated unions so future tasks can plug
 * richer shapes (e.g. multi-cell buildings, plot/foundation/frame/roofed/inhabited
 * stages) without breaking the Town API.
 *
 * This file is intentionally data-only: no THREE, no DOM. The simulation
 * engine doesn't care how a zone is rendered — only that it can be ticked.
 */

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

export type ConstructionStage = "plot" | "foundation" | "frame" | "roofed" | "inhabited"

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

/** Lightweight snapshot for the HUD / test contract. */
export interface WorldSnapshot {
  readonly simTime: number
  readonly phase: DayPhase
  readonly zoneCount: number
  readonly roadCount: number
  readonly buildingCount: number
  readonly residentCount: number
  readonly vehicleCount: number
}

/**
 * The Town owns the sim clock and the canonical entity arrays. Other tasks
 * (zones, roads, buildings, residents, vehicles, traffic) push into it via
 * the `addX` methods and read it through the snapshot.
 *
 * Pure TypeScript: no THREE, no DOM. `tick(dt)` advances the day/night cycle
 * and is a no-op for the (currently empty) entity simulation.
 */
export class Town {
  readonly zones: Zone[] = []
  readonly roads: Road[] = []
  readonly buildings: Building[] = []
  readonly residents: Resident[] = []
  readonly vehicles: Vehicle[] = []
  /** Per-instance counter — ids stay unique within a Town without any global state. */
  #idCounter = 0

  constructor(public readonly dayNight: DayNightSystem) {}

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
    return building
  }

  addResident(homeId: string | null = null, workId: string | null = null): Resident {
    this.#idCounter += 1
    const resident: Resident = {
      id: this.#id("p"),
      homeId,
      workId,
      // Deterministic per-resident seed derived from the id counter so the same
      // sim produces the same colour assignment across runs (and tests).
      colorSeed: this.#idCounter * 2654435761,
    }
    this.residents.push(resident)
    return resident
  }

  addVehicle(): Vehicle {
    this.#idCounter += 1
    // 32-bit Knuth multiplicative hash — small enough to avoid precision loss
    // in JS's float64 and stable across runs.
    const KNUTH_HASH = 2654435761
    const vehicle: Vehicle = {
      id: this.#id("v"),
      colorSeed: (this.#idCounter * KNUTH_HASH) | 0,
    }
    this.vehicles.push(vehicle)
    return vehicle
  }

  /** Advance the simulation by real `dt` seconds. Returns the snapshot AFTER the tick. */
  tick(dt: number): WorldSnapshot {
    this.dayNight.tick(dt)
    // Future: building construction, traffic, residents walking — all delegated
    // to other tasks. For now: clock only.
    return this.snapshot()
  }

  /** Read-only view of the world for HUD / e2e contract. */
  snapshot(): WorldSnapshot {
    return {
      simTime: this.dayNight.simTime,
      phase: this.dayNight.phase,
      zoneCount: this.zones.length,
      roadCount: this.roads.length,
      buildingCount: this.buildings.length,
      residentCount: this.residents.length,
      vehicleCount: this.vehicles.length,
    }
  }

  #id(prefix: string): string {
    return `${prefix}-${this.#idCounter.toString(36)}`
  }
}
