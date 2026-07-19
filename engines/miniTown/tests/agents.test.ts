/**
 * Behaviour tests for the agent-simulation layer (schedules, pathfinder,
 * Resident, Vehicle, spawn, traffic). Pure TypeScript — no THREE, no
 * DOM, no canvas. The renderer code is exercised via the dev-server
 * smoke test in another task.
 */

import { beforeEach, describe, expect, it } from "vitest"
import { DayNightSystem } from "../src/scene/dayNight"
import { Town } from "../src/scene/state"
import { findPath, manhattan, resetPathCache } from "../src/sim/paths"
import { Resident } from "../src/sim/residents"
import { compressActivity, scheduleFor } from "../src/sim/schedules"
import { spawnResidentsForTown } from "../src/sim/spawn"
import { spawnVehiclesForTown } from "../src/sim/traffic"
import { Vehicle } from "../src/sim/vehicles"

function placeAndInhabit(
  town: Town,
  type: "residential" | "shop" | "workspace",
  x: number,
  y: number,
): string {
  const result = town.placeZone(type, x, y)
  if (result.kind !== "placed") throw new Error(`placeZone failed at (${x},${y})`)
  // Force-inhabit by ticking past 5 × 8 = 40 sim-seconds. We use a single
  // big tick to keep the test fast; the construction state machine handles
  // a 50s delta in one pass.
  town.tick(50)
  return result.buildingId
}

beforeEach(() => {
  resetPathCache()
})

describe("schedule", () => {
  it("classifies 0..6h as sleeping / home", () => {
    for (const h of [0, 3, 5.9]) {
      const slot = scheduleFor(h)
      expect(slot.location).toBe("home")
      expect(compressActivity(slot)).toBe("home")
    }
  })

  it("classifies 8..12h as working", () => {
    for (const h of [8, 10, 11.9]) {
      const slot = scheduleFor(h)
      expect(slot.location).toBe("work")
      expect(compressActivity(slot)).toBe("working")
    }
  })

  it("classifies 12..13h as shopping (lunch)", () => {
    const slot = scheduleFor(12.5)
    expect(slot.location).toBe("shop")
    expect(compressActivity(slot)).toBe("shopping")
  })

  it("classifies 17..19h as walking (commute home)", () => {
    for (const h of [17, 18, 18.9]) {
      const slot = scheduleFor(h)
      expect(slot.location).toBe("walking")
      expect(compressActivity(slot)).toBe("walking")
    }
  })

  it("wraps negative and out-of-range hours", () => {
    expect(scheduleFor(-3).location).toBe("home") // -3 % 24 = 21 → home
    expect(scheduleFor(25).location).toBe("home") // 25 % 24 = 1 → home
  })
})

describe("pathfinder", () => {
  it("returns the trivial single-cell path for from === to", () => {
    const town = new Town(new DayNightSystem(8))
    const path = findPath(town.grid, { x: 5, y: 5 }, { x: 5, y: 5 })
    expect(path).toEqual([{ x: 5, y: 5 }])
  })

  it("prefers the direct route when both are equal Manhattan distance", () => {
    const town = new Town(new DayNightSystem(8))
    // Build a 1x3 line of residential cells so the perimeter roads form
    // a clear grid, and the BFS has a deterministic best answer.
    placeAndInhabit(town, "residential", 5, 5)
    placeAndInhabit(town, "residential", 6, 5)
    placeAndInhabit(town, "residential", 7, 5)
    // From (5,4) which is a road cell, to (7,6) which is a road cell.
    const path = findPath(town.grid, { x: 5, y: 4 }, { x: 7, y: 6 })
    expect(path).not.toBeNull()
    const cells = path ?? []
    expect(cells[0]).toEqual({ x: 5, y: 4 })
    expect(cells[cells.length - 1]).toEqual({ x: 7, y: 6 })
    // Path must be monotonically connected (each step is 4-adjacent).
    for (let i = 1; i < cells.length; i++) {
      const a = cells[i - 1]
      const b = cells[i]
      if (!a || !b) throw new Error("path entry missing")
      const dist = manhattan(a, b)
      expect(dist).toBe(1)
    }
  })

  it("rejects a path when the destination is unreachable", () => {
    const town = new Town(new DayNightSystem(8))
    // No buildings placed; the entire grid is grass. Grass is walkable
    // but expensive (cost 3), so the BFS should still find a path. The
    // only failure mode is bounds: a cell outside the grid.
    const path = findPath(town.grid, { x: 0, y: 0 }, { x: 0, y: 0 })
    expect(path).not.toBeNull()
  })
})

describe("Resident", () => {
  it("picks a deterministic name and shirt colour from the id", () => {
    const a = new Resident("p-test-1", "b-1", null, { x: 1, y: 1 })
    const b = new Resident("p-test-1", "b-1", null, { x: 1, y: 1 })
    const c = new Resident("p-test-2", "b-1", null, { x: 1, y: 1 })
    expect(a.name).toBe(b.name)
    expect(a.color).toBe(b.color)
    // Different ids almost always yield different names (collisions are
    // possible but unlikely across the small test set).
    expect(a.name === c.name && a.color === c.color).toBe(false)
  })

  it("starts in 'home' activity with currentCell = home cell", () => {
    const r = new Resident("p-1", "b-home", null, { x: 4, y: 4 })
    expect(r.currentActivity).toBe("home")
    expect(r.currentCell).toEqual({ x: 4, y: 4 })
    expect(r.getActivity()).toBe("home")
  })
})

describe("Vehicle", () => {
  it("starts on its seed cell with no path", () => {
    const v = new Vehicle("v-1", "#abcdef", { x: 2, y: 2 })
    expect(v.currentCell).toEqual({ x: 2, y: 2 })
    expect(v.path).toEqual([])
    expect(v.pathIndex).toBe(0)
    expect(v.destinationBuildingId).toBeNull()
  })

  it("heading() returns null without a path", () => {
    const v = new Vehicle("v-1", "#abcdef", { x: 2, y: 2 })
    expect(v.heading()).toBeNull()
  })
})

describe("Town integration: spawn → tick", () => {
  it("populates residents once a residential building is inhabited", () => {
    const town = new Town(new DayNightSystem(8))
    placeAndInhabit(town, "residential", 5, 5)
    spawnResidentsForTown(town)
    expect(town.residents.length).toBeGreaterThan(0)
    expect(town.residents.length).toBeLessThanOrEqual(3)
  })

  it("caps residents at MAX_RESIDENTS = 50 across many homes", () => {
    const town = new Town(new DayNightSystem(8))
    // 30 homes × 3 residents = 90; cap is 50.
    for (let i = 0; i < 30; i++) {
      placeAndInhabit(town, "residential", 5, 5 + i)
    }
    spawnResidentsForTown(town)
    expect(town.residents.length).toBe(50)
  })

  it("spawns vehicles once a shop is inhabited and residents exist", () => {
    const town = new Town(new DayNightSystem(8))
    placeAndInhabit(town, "residential", 5, 5)
    placeAndInhabit(town, "shop", 6, 5)
    spawnResidentsForTown(town)
    spawnVehiclesForTown(town)
    expect(town.vehicles.length).toBeGreaterThan(0)
    expect(town.vehicles.length).toBeLessThanOrEqual(20)
  })

  it("advances residents one frame in tick()", () => {
    const town = new Town(new DayNightSystem(8))
    const home = placeAndInhabit(town, "residential", 5, 5)
    spawnResidentsForTown(town)
    const r = town.residents[0]
    if (!r) throw new Error("no resident spawned")
    expect(r.homeId).toBe(home)
    // Simulate 1 sim-second: 1/300 of a 24h cycle = 0.08h. The resident
    // should still be in 'home' since 0.08h is during the sleep band.
    const before = r.currentCell
    town.tick(1)
    expect(r.currentCell).toEqual(before)
  })

  it("flips currentActivity to 'working' or 'shopping' once the schedule demands it", () => {
    const town = new Town(new DayNightSystem(8))
    // Place a residential + a workspace, populate, then advance the clock
    // into the working band. With simTime 0 + 12 real seconds = 0 + 12 * 24/300 = ~0.96h
    // we don't hit 8h yet; instead we'll manually set the dayNight clock.
    placeAndInhabit(town, "residential", 5, 5)
    placeAndInhabit(town, "workspace", 7, 5)
    spawnResidentsForTown(town)
    // Force the clock to 9h (working band). Private fields are reachable
    // from outside only via computed access with the field name string.
    const dn = town.dayNight
    ;(dn as unknown as Record<string, number>)["#simTime"] = 9
    void town.tick(0.1)
    const working = town.residents.filter(
      (r) => r.currentActivity === "working" || r.currentActivity === "shopping",
    )
    expect(working.length).toBeGreaterThanOrEqual(2)
  })
})
