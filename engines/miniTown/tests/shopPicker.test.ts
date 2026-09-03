/**
 * Permanent regression coverage for `Town.pickRandomShopId`
 * (follow-up AID-695 to the AID-694 triage of PR #254). Locks in:
 *
 * 1. Eligibility — only buildings at stage `inhabited` whose zone type is
 *    `shop` are candidates (inhabited residential/workspace and
 *    earlier-stage shops are excluded).
 * 2. rng discipline — exactly one stream roll per successful pick, zero
 *    rolls when no shop is eligible (null without touching the stream).
 * 3. Lockstep mapping — the pick is `floor(nextRoll * eligibleCount)`
 *    over the deterministic splitmix32 stream, advancing it by exactly one.
 * 4. Distribution — picks approximate uniform over the eligible set.
 */

import { describe, expect, it } from "vitest"
import { DayNightSystem } from "../src/scene/dayNight"
import { Town } from "../src/scene/state"

/**
 * 5 stages × STAGE_SECONDS (8s): a `tick(50)` leaves batch 1 at `inhabited`,
 * while batch 2 (placed later, `tick(16)`) never passes `frame`.
 * `placeZone`/`tick` never consume rng, so identically built towns share one
 * rng stream position — that is what makes the lockstep assertions below work.
 */
function buildMixedTown(): Town {
  const town = new Town(new DayNightSystem(8))
  // Batch 1 (reaches `inhabited`): 3 shops + 1 residential + 1 workspace.
  town.placeZone("shop", 0, 0)
  town.placeZone("shop", 2, 0)
  town.placeZone("shop", 4, 0)
  town.placeZone("residential", 6, 0)
  town.placeZone("workspace", 8, 0)
  town.tick(50)
  // Batch 2 (stuck in intermediate stages): 2 shops + 1 residential.
  town.placeZone("shop", 0, 2)
  town.placeZone("shop", 2, 2)
  town.placeZone("residential", 4, 2)
  town.tick(16)
  return town
}

/** The eligible set the picker is contractually allowed to return. */
function eligibleShopIds(town: Town): string[] {
  return town.buildings
    .filter((b) => b.stage === "inhabited" && town.findZoneById(b.zoneId)?.type === "shop")
    .map((b) => b.id)
}

/** Runs `fn` and reports how many times the town's rng stream advanced. */
function countRngRolls(town: Town, fn: () => unknown): number {
  const original = town.rng.bind(town)
  let rolls = 0
  town.rng = () => {
    rolls += 1
    return original()
  }
  try {
    fn()
  } finally {
    town.rng = original as typeof town.rng
  }
  return rolls
}

describe("Town.pickRandomShopId", () => {
  it("selects only inhabited shop buildings (stage + zone eligibility)", () => {
    const town = buildMixedTown()
    const eligible = new Set(eligibleShopIds(town))
    // 3 inhabited shops; the inhabited residential/workspace pair and the two
    // earlier-stage shops must all be excluded from the eligible set.
    expect(eligible.size).toBe(3)
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const id = town.pickRandomShopId()
      expect(id).not.toBeNull()
      expect(eligible.has(id as string)).toBe(true)
      seen.add(id as string)
    }
    expect(seen.size).toBe(eligible.size)
  })

  it("returns null without consuming rng when no shop is eligible", () => {
    const town = new Town(new DayNightSystem(8))
    town.placeZone("residential", 0, 0)
    town.tick(50) // inhabited, but residential — not eligible
    town.placeZone("shop", 2, 0) // shop, but still pre-inhabited — not eligible
    town.tick(4)
    const rolls = countRngRolls(town, () => {
      expect(town.pickRandomShopId()).toBeNull()
    })
    expect(rolls).toBe(0)
  })

  it("consumes exactly one rng roll per successful pick", () => {
    const town = buildMixedTown()
    for (let i = 0; i < 3; i++) {
      const rolls = countRngRolls(town, () => {
        expect(town.pickRandomShopId()).not.toBeNull()
      })
      expect(rolls).toBe(1)
    }
  })

  it("maps the next rng roll onto the eligible set and advances the stream by one (lockstep)", () => {
    const pickTown = buildMixedTown()
    const rngTown = buildMixedTown()
    const shops = eligibleShopIds(rngTown)
    expect(shops).toHaveLength(3)

    // The pick must equal floor(roll * n) over the next stream value...
    const roll = rngTown.rng()
    const expected = shops[Math.floor(roll * shops.length)]
    expect(pickTown.pickRandomShopId()).toBe(expected)
    // ...and consume exactly that one value: both towns now roll alike again.
    expect(pickTown.rng()).toBe(rngTown.rng())
  })

  it("approximates a uniform distribution over 10k draws (4 shops)", () => {
    const town = new Town(new DayNightSystem(8))
    for (let x = 0; x < 4; x++) town.placeZone("shop", x * 2, 0)
    town.tick(50)
    const eligible = eligibleShopIds(town)
    expect(eligible).toHaveLength(4)

    const counts = new Map<string, number>(eligible.map((id) => [id, 0]))
    const draws = 10_000
    for (let i = 0; i < draws; i++) {
      const id = town.pickRandomShopId() as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const expected = draws / eligible.length
    let chiSq = 0
    for (const n of counts.values()) {
      expect(n).toBeGreaterThan(0)
      chiSq += (n - expected) ** 2 / expected
    }
    // df=3, p~0.001 critical value ~16.3 — a generous smoke bound; the rng is
    // deterministic, so this guards against a biased or broken mapping regressing.
    expect(chiSq).toBeLessThan(16.27)
  })
})
