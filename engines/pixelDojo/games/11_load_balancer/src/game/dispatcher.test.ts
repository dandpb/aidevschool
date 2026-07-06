import { describe, expect, it } from "vitest"
import {
  type Algorithm,
  algorithmMatchesShape,
  commitRouting,
  createDispatchState,
  type DispatchState,
  hashSession,
  inflightSkew,
  type Orb,
  pickPillar,
  pillarEligible,
  releaseInflight,
  stickyHome,
} from "./dispatcher"

// Helper: read a pillar by id, throwing if missing (test-only — avoids the
// `!` non-null assertion that biome forbids).
function pillar(state: DispatchState, id: number) {
  const p = state.pillars[id]
  if (p === undefined) {
    throw new Error(`pillar ${id} missing`)
  }
  return p
}

// Helper: kill a pillar (test-only).
function kill(state: DispatchState, id: number) {
  pillar(state, id).health = "dead"
}

describe("createDispatchState", () => {
  it("seeds N=6 pillars with pillar #2 unhealthy", () => {
    const state = createDispatchState()
    expect(state.pillars).toHaveLength(6)
    expect(state.rrPointer).toBe(-1)
    expect(pillar(state, 2).health).toBe("unhealthy")
    expect(pillarEligible(pillar(state, 2))).toBe(false)
    for (let i = 0; i < 6; i += 1) {
      if (i === 2) continue
      expect(pillarEligible(pillar(state, i))).toBe(true)
    }
  })
})

describe("pickPillar round-robin", () => {
  it("starts at pillar 0 and advances by one per shot, skipping unhealthy", () => {
    const state = createDispatchState()
    const orb: Orb = { id: 1, shape: "plain", session: null }

    expect(pickPillar(state, orb, "round_robin")).toEqual({ kind: "routed", pillarId: 0 })
    commitRouting(state, orb, "round_robin", 0)

    expect(pickPillar(state, orb, "round_robin")).toEqual({ kind: "routed", pillarId: 1 })
    commitRouting(state, orb, "round_robin", 1)

    // Pillar 2 is unhealthy → skipped.
    expect(pickPillar(state, orb, "round_robin")).toEqual({ kind: "routed", pillarId: 3 })
    commitRouting(state, orb, "round_robin", 3)

    expect(pickPillar(state, orb, "round_robin")).toEqual({ kind: "routed", pillarId: 4 })
    commitRouting(state, orb, "round_robin", 4)

    expect(pickPillar(state, orb, "round_robin")).toEqual({ kind: "routed", pillarId: 5 })
    commitRouting(state, orb, "round_robin", 5)

    // Wrap.
    expect(pickPillar(state, orb, "round_robin")).toEqual({ kind: "routed", pillarId: 0 })
  })

  it("returns no_eligible when every pillar is dead", () => {
    const state = createDispatchState()
    for (let i = 0; i < 6; i += 1) {
      kill(state, i)
    }
    const orb: Orb = { id: 1, shape: "plain", session: null }
    expect(pickPillar(state, orb, "round_robin")).toEqual({ kind: "no_eligible" })
  })
})

describe("pickPillar least-connections", () => {
  it("picks the eligible pillar with the lowest in-flight count", () => {
    const state = createDispatchState()
    // Pile two in-flight orbs onto pillar 0, one onto pillar 1.
    pillar(state, 0).inflight = 2
    pillar(state, 1).inflight = 1
    // Pillars 3, 4, 5 are still at 0; 2 is unhealthy.
    const orb: Orb = { id: 1, shape: "plain", session: null }
    expect(pickPillar(state, orb, "least_connections")).toEqual({
      kind: "routed",
      pillarId: 3,
    })
  })

  it("tie-breaks by lowest id when multiple pillars share the min", () => {
    const state = createDispatchState()
    const orb: Orb = { id: 1, shape: "plain", session: null }
    // All eligible pillars at 0 → lowest id wins (pillar 0).
    expect(pickPillar(state, orb, "least_connections")).toEqual({
      kind: "routed",
      pillarId: 0,
    })
  })

  it("does not advance the RR pointer", () => {
    const state = createDispatchState()
    const orb: Orb = { id: 1, shape: "plain", session: null }
    commitRouting(state, orb, "least_connections", 4)
    expect(state.rrPointer).toBe(-1)
  })
})

describe("pickPillar consistent-hash", () => {
  it("routes the same session to the same pillar deterministically", () => {
    const state = createDispatchState()
    const orb: Orb = { id: 1, shape: "sticky", session: "S:a3f" }
    const first = pickPillar(state, orb, "consistent_hash")
    const second = pickPillar(state, orb, "consistent_hash")
    expect(first).toEqual(second)
    expect(first.kind).toBe("routed")
    expect(stickyHome(state, "S:a3f")).toBe(first.kind === "routed" ? first.pillarId : null)
  })

  it("walks forward to the next eligible pillar when the hashed slot is dead", () => {
    const state = createDispatchState()
    const session = "S:a3f"
    const home = stickyHome(state, session)
    expect(home).not.toBeNull()
    if (home === null) return
    // Kill the natural home — the next pick should skip it.
    kill(state, home)
    const rerouted = pickPillar(state, { id: 1, shape: "sticky", session }, "consistent_hash")
    expect(rerouted.kind).toBe("routed")
    if (rerouted.kind === "routed") {
      expect(rerouted.pillarId).not.toBe(home)
      expect(pillarEligible(pillar(state, rerouted.pillarId))).toBe(true)
    }
  })

  it("falls back to round-robin when the orb carries no session", () => {
    const state = createDispatchState()
    const orb: Orb = { id: 1, shape: "sticky", session: null }
    expect(pickPillar(state, orb, "consistent_hash")).toEqual({
      kind: "routed",
      pillarId: 0,
    })
  })
})

describe("hashSession", () => {
  it("is stable and within range", () => {
    const h1 = hashSession("S:a3f", 6)
    const h2 = hashSession("S:a3f", 6)
    expect(h1).toBe(h2)
    expect(h1).toBeGreaterThanOrEqual(0)
    expect(h1).toBeLessThan(6)
    // Different sessions should usually hash differently.
    const different = new Set<number>()
    for (const s of ["a", "b", "c", "d", "e", "f"]) {
      different.add(hashSession(s, 6))
    }
    expect(different.size).toBeGreaterThan(1)
  })
})

describe("algorithmMatchesShape", () => {
  it("requires least_connections for heavy orbs", () => {
    expect(algorithmMatchesShape("heavy", "least_connections")).toBe(true)
    expect(algorithmMatchesShape("heavy", "round_robin")).toBe(false)
    expect(algorithmMatchesShape("heavy", "consistent_hash")).toBe(false)
  })

  it("requires consistent_hash for sticky orbs", () => {
    expect(algorithmMatchesShape("sticky", "consistent_hash")).toBe(true)
    expect(algorithmMatchesShape("sticky", "round_robin")).toBe(false)
    expect(algorithmMatchesShape("sticky", "least_connections")).toBe(false)
  })

  it("accepts any algorithm for plain orbs", () => {
    const algos: Algorithm[] = ["round_robin", "least_connections", "consistent_hash"]
    for (const a of algos) {
      expect(algorithmMatchesShape("plain", a)).toBe(true)
    }
  })
})

describe("commitRouting / releaseInflight", () => {
  it("tracks total + heavy in-flight per pillar", () => {
    const state = createDispatchState()
    const heavy: Orb = { id: 1, shape: "heavy", session: null }
    const plain: Orb = { id: 2, shape: "plain", session: null }

    commitRouting(state, heavy, "least_connections", 0)
    commitRouting(state, plain, "round_robin", 0)
    expect(pillar(state, 0).inflight).toBe(2)
    expect(pillar(state, 0).inflightHeavy).toBe(1)

    releaseInflight(state, 0, "heavy")
    expect(pillar(state, 0).inflight).toBe(1)
    expect(pillar(state, 0).inflightHeavy).toBe(0)

    releaseInflight(state, 0, "plain")
    expect(pillar(state, 0).inflight).toBe(0)
  })

  it("clamps at zero — never negative", () => {
    const state = createDispatchState()
    releaseInflight(state, 0, "heavy")
    expect(pillar(state, 0).inflight).toBe(0)
    expect(pillar(state, 0).inflightHeavy).toBe(0)
  })

  it("advances rrPointer only under round_robin", () => {
    const state = createDispatchState()
    const orb: Orb = { id: 1, shape: "plain", session: null }
    commitRouting(state, orb, "least_connections", 4)
    expect(state.rrPointer).toBe(-1)
    commitRouting(state, orb, "consistent_hash", 5)
    expect(state.rrPointer).toBe(-1)
    commitRouting(state, orb, "round_robin", 3)
    expect(state.rrPointer).toBe(3)
  })
})

describe("inflightSkew", () => {
  it("returns max - min across pillars", () => {
    const state = createDispatchState()
    expect(inflightSkew(state.pillars)).toBe(0)
    pillar(state, 0).inflight = 3
    pillar(state, 1).inflight = 1
    expect(inflightSkew(state.pillars)).toBe(3)
  })

  it("returns 0 for an empty pillar set", () => {
    expect(inflightSkew([])).toBe(0)
  })
})
