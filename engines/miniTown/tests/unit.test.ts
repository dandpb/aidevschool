import { describe, expect, it } from "vitest"
import {
  DayNightSystem,
  phaseFor,
  realSecondsToSimHours,
  SIM_SECONDS_PER_CYCLE,
} from "../src/scene/dayNight"
import { Town } from "../src/scene/state"

describe("day/night math", () => {
  it("converts real seconds to sim hours at the documented rate", () => {
    // 5 min real = 24 sim hours
    expect(SIM_SECONDS_PER_CYCLE).toBe(300)
    expect(realSecondsToSimHours(SIM_SECONDS_PER_CYCLE)).toBeCloseTo(24, 6)
    // 2.5 min real = 12 sim hours
    expect(realSecondsToSimHours(150)).toBeCloseTo(12, 6)
  })

  it("classifies hours into the right phase buckets", () => {
    expect(phaseFor(0)).toBe("night")
    expect(phaseFor(4.9)).toBe("night")
    expect(phaseFor(5)).toBe("dawn")
    expect(phaseFor(6.9)).toBe("dawn")
    expect(phaseFor(7)).toBe("morning")
    expect(phaseFor(10.9)).toBe("morning")
    expect(phaseFor(11)).toBe("noon")
    expect(phaseFor(13.9)).toBe("noon")
    expect(phaseFor(14)).toBe("afternoon")
    expect(phaseFor(16.9)).toBe("afternoon")
    expect(phaseFor(17)).toBe("sunset")
    expect(phaseFor(18.9)).toBe("sunset")
    expect(phaseFor(19)).toBe("dusk")
    expect(phaseFor(19.9)).toBe("dusk")
    expect(phaseFor(20)).toBe("night")
    expect(phaseFor(23.9)).toBe("night")
  })

  it("wraps out-of-range hours without breaking the phase lookup", () => {
    expect(phaseFor(24)).toBe("night")
    expect(phaseFor(-1)).toBe("night")
    // 25 % 24 = 1 → still night. The point is the function doesn't throw.
    expect(phaseFor(25)).toBe("night")
  })
})

describe("DayNightSystem", () => {
  it("starts at the configured morning hour and reports a coherent phase", () => {
    const dn = new DayNightSystem(8)
    expect(dn.simTime).toBe(8)
    expect(dn.phase).toBe("morning")
  })

  it("advances simTime when tick(dt) is called repeatedly", () => {
    const dn = new DayNightSystem(8)
    const before = dn.simTime
    // 30 real seconds = 2.4 sim hours
    dn.tick(30)
    expect(dn.simTime).toBeCloseTo(before + 2.4, 6)
  })

  it("changes phase after enough hours have accumulated", () => {
    // Start at 8h (morning). Travel forward 4h → noon. Then 6h → night.
    // To advance N sim hours, pass dt = N * (300 / 24) real seconds = 12.5 * N.
    const dn = new DayNightSystem(8)
    expect(dn.phase).toBe("morning")
    dn.tick(50) // +4 sim hours → 12:00
    expect(dn.phase).toBe("noon")
    dn.tick(75) // +6 sim hours → 18:00
    expect(dn.phase).toBe("sunset")
  })

  it("wraps simTime past 24h instead of overflowing", () => {
    const dn = new DayNightSystem(20)
    // +8 sim hours from 20:00 → wraps to 04:00 (night)
    dn.tick(100)
    expect(dn.simTime).toBeCloseTo(4, 6)
    expect(dn.phase).toBe("night")
  })
})

describe("Town", () => {
  it("starts with empty entity arrays and a fresh day/night clock", () => {
    const town = new Town(new DayNightSystem(8))
    const snap = town.snapshot()
    expect(snap.zoneCount).toBe(0)
    expect(snap.roadCount).toBe(0)
    expect(snap.buildingCount).toBe(0)
    expect(snap.residentCount).toBe(0)
    expect(snap.vehicleCount).toBe(0)
    expect(snap.simTime).toBe(8)
    expect(snap.phase).toBe("morning")
  })

  it("addZone / addRoad / addBuilding grow the right arrays", () => {
    const town = new Town(new DayNightSystem(8))
    const zone = town.addZone("residential", 2, 3)
    town.addRoad({ x: 0, y: 0 })
    town.addBuilding(zone.id, { x: 2, y: 3 }, 42)

    expect(town.zones.length).toBe(1)
    expect(town.roads.length).toBe(1)
    expect(town.buildings.length).toBe(1)
    expect(town.buildings[0]?.paletteSeed).toBe(42)
    expect(town.buildings[0]?.stage).toBe("plot")
    expect(zone.id).toMatch(/^z-/)
  })

  it("tick(dt) advances simTime and returns an updated snapshot", () => {
    const town = new Town(new DayNightSystem(8))
    // +2 sim hours from 8:00 → 10:00 (still morning).
    const snap = town.tick(25)
    expect(snap.simTime).toBeCloseTo(10, 6)
    expect(snap.phase).toBe("morning")
  })
})
