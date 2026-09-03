/**
 * Regression tests for `Town.pickRandomShopId` (AID-695, follow-up to the
 * AID-694 triage of PR #254). Locks into the permanent suite what the triage
 * proved with an ephemeral differential harness:
 *
 * 1. eligibility — only `inhabited` buildings on `shop` zones are candidates
 *    (residential / workspace zones and intermediate construction stages are
 *    excluded);
 * 2. rng discipline — exactly one `town.rng()` draw per call when an eligible
 *    shop exists and zero draws when none does;
 * 3. membership + ~uniform spread — every result lands inside the eligible
 *    set and, over many calls, the eligible shops are picked roughly equally.
 *
 * Harness note: `placeZone` / `tick` never consume rng (the only scene-layer
 * consumer is `pickRandomShopId` itself, src/scene/state.ts), so two towns
 * built by the same deterministic sequence share one splitmix32 stream. The
 * twin-town pattern below uses that lockstep to count draws without touching
 * the private PRNG state.
 */

import { describe, expect, it } from "vitest"
import { DayNightSystem } from "../src/scene/dayNight"
import { Town } from "../src/scene/state"

/** Inhabited mix: 3 eligible shops + 2 inhabited non-shop zones + 1 fresh shop still on `plot`. */
function buildShoppingTown(): Town {
  const town = new Town(new DayNightSystem(8))
  const placed = [
    town.placeZone("shop", 5, 5),
    town.placeZone("shop", 8, 5),
    town.placeZone("shop", 11, 5),
    town.placeZone("residential", 5, 9),
    town.placeZone("workspace", 8, 9),
  ]
  for (const result of placed) expect(result.kind).toBe("placed")
  // 5 stages × 8 sim-seconds: everything placed above reaches `inhabited`.
  town.tick(50)
  // Placed after graduation — stays `plot`, so it must never be picked.
  const late = town.placeZone("shop", 11, 9)
  expect(late.kind).toBe("placed")
  return town
}

/** No eligible shop: inhabited non-shop zones plus one uninhabited shop. */
function buildNoShopTown(): Town {
  const town = new Town(new DayNightSystem(8))
  town.placeZone("residential", 5, 5)
  town.placeZone("workspace", 8, 5)
  town.tick(50)
  town.placeZone("shop", 5, 9)
  return town
}

/** Ids of buildings that satisfy the eligibility rule, in `town.buildings` order. */
function eligibleShopIds(town: Town): string[] {
  return town.buildings
    .filter((b) => b.stage === "inhabited" && town.findZoneById(b.zoneId)?.type === "shop")
    .map((b) => b.id)
}

describe("Town.pickRandomShopId", () => {
  it("treats only inhabited shop-zone buildings as eligible", () => {
    const town = buildShoppingTown()

    const eligible = eligibleShopIds(town)
    expect(eligible).toHaveLength(3)
    // Every other building is excluded for a reason the rule names: wrong
    // zone type (residential / workspace) or non-inhabited stage (`plot`).
    for (const building of town.buildings) {
      if (eligible.includes(building.id)) continue
      const zoneType = town.findZoneById(building.zoneId)?.type
      const wouldQualify = zoneType === "shop" && building.stage === "inhabited"
      expect(wouldQualify).toBe(false)
    }
  })

  it("returns a member of the eligible set on every call", () => {
    const town = buildShoppingTown()
    const eligible = eligibleShopIds(town)

    for (let i = 0; i < 100; i++) {
      expect(eligible).toContain(town.pickRandomShopId())
    }
  })

  it("consumes exactly one rng draw per call and maps it onto the eligible order", () => {
    const picking = buildShoppingTown()
    const observing = buildShoppingTown()
    const eligible = eligibleShopIds(picking)

    // The draw `picking` is about to make inside pickRandomShopId().
    const draw = observing.rng()
    const picked = picking.pickRandomShopId()

    expect(picked).toBe(eligible[Math.floor(draw * eligible.length)])
    // One draw consumed on each side → the streams are still in lockstep.
    expect(picking.rng()).toBe(observing.rng())
  })

  it("returns null and consumes zero rng draws when no shop is eligible", () => {
    const empty = new Town(new DayNightSystem(8))
    const emptyTwin = new Town(new DayNightSystem(8))
    expect(empty.pickRandomShopId()).toBeNull()
    expect(empty.rng()).toBe(emptyTwin.rng())

    const noShop = buildNoShopTown()
    const noShopTwin = buildNoShopTown()
    expect(noShop.pickRandomShopId()).toBeNull()
    expect(noShop.rng()).toBe(noShopTwin.rng())
  })

  it("spreads picks approximately uniformly across the eligible shops", () => {
    const town = buildShoppingTown()
    const eligible = eligibleShopIds(town)
    const draws = 3000
    const counts = new Map<string, number>(eligible.map((id) => [id, 0]))

    for (let i = 0; i < draws; i++) {
      const picked = town.pickRandomShopId()
      expect(picked).toBeDefined()
      counts.set(picked as string, (counts.get(picked as string) ?? 0) + 1)
    }

    const expectedShare = draws / eligible.length
    // 4σ multinomial band — generous for a deterministic PRNG, tight enough
    // to catch a biased or clamped index mapping.
    const tolerance = 4 * Math.sqrt(draws)
    for (const count of counts.values()) {
      expect(Math.abs(count - expectedShare)).toBeLessThanOrEqual(tolerance)
    }
  })
})
