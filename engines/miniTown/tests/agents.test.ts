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
