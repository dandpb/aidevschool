import { describe, expect, it } from "vitest"
import { fnv1a } from "./hash"
import {
  evaluatePredictions,
  evaluateSkewFix,
  evaluateTopologyChange,
  keysFor,
  levelConfig,
  makeStations,
} from "./levels"
import {
  anchorsOf,
  assign,
  loadSkew,
  moduloAssign,
  movedKeys,
  ownerOf,
  theoreticalMovedFraction,
} from "./ring"
import { keyStream, mulberry32 } from "./rng"

const KEYS = keyStream(mulberry32(42), 10_000)

describe("ownership", () => {
  it("assigns every key to the next anchor clockwise, wrapping past the top", () => {
    const stations = makeStations(3, 8)
    const anchors = anchorsOf(stations)
    const top = anchors[anchors.length - 1]
    if (!top || !anchors[0]) throw new Error("no anchors")
    expect(ownerOf(top.hash + 1, anchors)).toBe(anchors[0].stationId)
    expect(ownerOf(top.hash, anchors)).toBe(top.stationId)
  })

  it("is deterministic: same seed ⇒ same stream ⇒ same assignment", () => {
    const a = assign(keyStream(mulberry32(7), 500), makeStations(4, 16))
    const b = assign(keyStream(mulberry32(7), 500), makeStations(4, 16))
    expect([...a.entries()]).toEqual([...b.entries()])
  })
})

describe("the K/N bound (the lesson of L2)", () => {
  it("join: moved fraction stays near 1/(N+1) and far below the modulo storm", () => {
    const before = makeStations(4, 64)
    const after = [...before, { id: "st-new", vnodes: 64 }]
    const moved = movedKeys(assign(KEYS, before), assign(KEYS, after)).length / KEYS.length
    const theoretical = theoreticalMovedFraction(4, 5) // 0.2
    expect(moved).toBeGreaterThan(theoretical * 0.5)
    expect(moved).toBeLessThan(theoretical * 1.5)
  })

  it("join: every moved key moves TO the new station (only the neighbor arc re-homes)", () => {
    const before = makeStations(4, 64)
    const after = [...before, { id: "st-new", vnodes: 64 }]
    const beforeAssign = assign(KEYS, before)
    const afterAssign = assign(KEYS, after)
    for (const k of movedKeys(beforeAssign, afterAssign)) {
      expect(afterAssign.get(k)).toBe("st-new")
    }
  })

  it("leave: exactly the departed station's keys move, nothing else", () => {
    const stations = makeStations(5, 64)
    const survivor = stations.slice(0, 4)
    const beforeAssign = assign(KEYS, stations)
    const afterAssign = assign(KEYS, survivor)
    const moved = new Set(movedKeys(beforeAssign, afterAssign))
    for (const [k, owner] of beforeAssign) {
      expect(moved.has(k)).toBe(owner === "st-4")
    }
  })
})

describe("the modulo contrast (the lesson of L4)", () => {
  it("hash % N moves the vast majority of keys on a single join", () => {
    const before = moduloAssign(KEYS, makeStations(4))
    const after = moduloAssign(KEYS, [...makeStations(4), { id: "st-new", vnodes: 1 }])
    const moved = movedKeys(before, after).length / KEYS.length
    expect(moved).toBeGreaterThan(0.6) // theory: 1 - 1/5 = 0.8
  })
})

describe("virtual nodes (the lesson of L3)", () => {
  it("more vnodes ⇒ lower load skew on the same key stream", () => {
    const lumpy = loadSkew(assign(KEYS, makeStations(4, 1)), makeStations(4, 1))
    const smooth = loadSkew(assign(KEYS, makeStations(4, 64)), makeStations(4, 64))
    expect(smooth).toBeLessThan(lumpy)
    expect(smooth).toBeLessThan(1.3)
  })
})

describe("level evaluation", () => {
  it("L1 passes at ≥80% owner-prediction accuracy", () => {
    expect(evaluatePredictions(10, 12).pass).toBe(true)
    expect(evaluatePredictions(9, 12).pass).toBe(false)
  })

  it("L2 requires the right loser prediction AND a bounded moved ratio", () => {
    const cfg = levelConfig("L2")
    const keys = keysFor(cfg)
    const before = makeStations(cfg.startStations, 32)
    const after = [...before, { id: "st-new", vnodes: 32 }]
    const beforeAssign = assign(keys, before)
    const afterAssign = assign(keys, after)
    const losers = new Set(
      movedKeys(beforeAssign, afterAssign).map((k) => beforeAssign.get(k) as string),
    )
    const actualLoser = [...losers].sort(
      (a, b) => count(beforeAssign, b) - count(beforeAssign, a),
    )[0] as string
    const good = evaluateTopologyChange({
      keys,
      before,
      after,
      moduloMode: false,
      predictedLoserId: actualLoser,
      actualLoserId: actualLoser,
      contrastStated: false,
    })
    expect(good.pass).toBe(true)
    const bad = evaluateTopologyChange({
      keys,
      before,
      after,
      moduloMode: false,
      predictedLoserId: "st-0" === actualLoser ? "st-1" : "st-0",
      actualLoserId: actualLoser,
      contrastStated: false,
    })
    expect(bad.pass).toBe(false)
  })

  it("L3 passes only when vnodes actually fixed the skew", () => {
    const cfg = levelConfig("L3")
    const keys = keysFor(cfg)
    expect(evaluateSkewFix(keys, makeStations(4, 1)).pass).toBe(false)
    expect(evaluateSkewFix(keys, makeStations(4, 64)).pass).toBe(true)
  })

  it("L4 fails without the stated contrast even if predictions hold", () => {
    const cfg = levelConfig("L4")
    const keys = keysFor(cfg)
    const before = makeStations(cfg.startStations)
    const after = [...before, { id: "st-new", vnodes: 1 }]
    const out = evaluateTopologyChange({
      keys,
      before,
      after,
      moduloMode: true,
      predictedLoserId: "st-0",
      actualLoserId: "st-0",
      contrastStated: false,
    })
    expect(out.pass).toBe(false)
    expect(out.metrics.modulo_contrast_stated).toBe(false)
  })
})

describe("edge cases", () => {
  it("a single station owns every key, and a 1→2 join moves ≈ half", () => {
    const solo = makeStations(1, 32)
    const soloAssign = assign(KEYS, solo)
    for (const owner of soloAssign.values()) expect(owner).toBe("st-0")
    const duoAssign = assign(KEYS, [...solo, { id: "st-new", vnodes: 32 }])
    const moved = movedKeys(soloAssign, duoAssign).length / KEYS.length
    const theoretical = theoreticalMovedFraction(1, 2) // 0.5
    expect(moved).toBeGreaterThan(theoretical * 0.7)
    expect(moved).toBeLessThan(theoretical * 1.3)
  })

  it("anchor hash collisions resolve deterministically (stable sort ⇒ insertion order wins)", () => {
    const h = 12345
    const collided = [
      { hash: h, stationId: "st-a" },
      { hash: h, stationId: "st-b" },
    ]
    expect(ownerOf(h, collided)).toBe("st-a")
    expect(ownerOf(h - 1, collided)).toBe("st-a")
    expect(ownerOf(h + 1, collided)).toBe("st-a") // wraps past the top
  })

  it("an empty ring refuses to assign", () => {
    expect(() => ownerOf(0, [])).toThrow("empty ring")
    expect(() => moduloAssign(KEYS, [])).toThrow("empty ring")
  })
})

describe("hash", () => {
  it("fnv1a is stable and 32-bit", () => {
    expect(fnv1a("hello")).toBe(fnv1a("hello"))
    expect(fnv1a("hello")).toBeGreaterThanOrEqual(0)
    expect(fnv1a("hello")).toBeLessThan(0x100000000)
    expect(fnv1a("hello")).not.toBe(fnv1a("hellp"))
  })
})

function count(assignment: ReadonlyMap<string, string>, stationId: string): number {
  let n = 0
  for (const owner of assignment.values()) if (owner === stationId) n++
  return n
}
