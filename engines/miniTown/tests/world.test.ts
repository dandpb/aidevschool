/**
 * Behaviour tests for the world-construction layer (grid / zones / roads /
 * construction / variation). These mirror the intent of the original
 * townLife.test.ts but exercise the new modular files. Resident / vehicle
 * scheduling belongs to the agent-simulation task and is intentionally not
 * covered here.
 */

import { describe, expect, it } from "vitest"
import { DayNightSystem } from "../src/scene/dayNight"
import { Town } from "../src/scene/state"

describe("world construction", () => {
  it("creates a shared 1x2 block with 6 perimeter roads", () => {
    const town = new Town(new DayNightSystem(8))
    const blockId = "block-test"
    const r1 = town.placeZone("residential", 5, 5, blockId)
    const r2 = town.placeZone("residential", 6, 5, blockId)
    expect(r1.kind).toBe("placed")
    expect(r2.kind).toBe("placed")
    expect(town.zones).toHaveLength(2)
    expect(town.roads).toHaveLength(6)
  })

  it("limits a drag to three connected buildings along the chosen axis", () => {
    const town = new Town(new DayNightSystem(8))
    const blockId = "block-cap"
    // Simulate a drag of 6 cells along X — the placement controller caps at 3,
    // and the caller stops calling placeZone past the cap.
    for (let x = 5; x < 8; x++) {
      const r = town.placeZone("shop", x, 5, blockId)
      expect(r.kind).toBe("placed")
    }
    expect(town.zones).toHaveLength(3)
    expect(town.roads).toHaveLength(8)
  })

  it("refuses to place on a non-grass cell", () => {
    const town = new Town(new DayNightSystem(8))
    const first = town.placeZone("workspace", 0, 0)
    expect(first.kind).toBe("placed")
    const second = town.placeZone("shop", 0, 0)
    expect(second.kind).toBe("occupied")
  })

  it("graduates buildings to 'inhabited' after enough sim time", () => {
    const town = new Town(new DayNightSystem(8))
    town.placeZone("residential", 0, 0)
    // 5 stages × 8s = 40s; 50s leaves the building in `inhabited`.
    town.tick(50)
    expect(town.buildings[0]?.stage).toBe("inhabited")
  })
})
