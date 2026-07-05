import { describe, expect, it } from "vitest"
import {
  type Backend,
  makeBackend,
  makeRouter,
  policyRoute,
  probe,
  release,
  routeWave,
} from "./balancer"
import { mulberry32, type RequestSpec, requestStream } from "./rng"

function reqs(n: number, cost = 1): RequestSpec[] {
  return Array.from({ length: n }, (_, i) => ({ id: `req-${i}`, cost }))
}

/** Set a backend field by index without a non-null assertion (biome forbids `!`). */
function withField(backends: Backend[], index: number, patch: Partial<Backend>): Backend[] {
  const target = backends[index]
  if (target) Object.assign(target, patch)
  return backends
}

describe("round_robin", () => {
  it("distributes requests exactly evenly among healthy backends", () => {
    const backends = [makeBackend("b-0"), makeBackend("b-1"), makeBackend("b-2")]
    const state = makeRouter()
    for (const r of reqs(9)) policyRoute("round_robin", r, backends, state)
    const counts = backends.map((b) => b.routed)
    expect(counts).toEqual([3, 3, 3])
  })

  it("cycles in original-index order: 0,1,2,0,1,2,...", () => {
    const backends = [makeBackend("b-0"), makeBackend("b-1"), makeBackend("b-2")]
    const state = makeRouter()
    const picks: string[] = []
    for (const r of reqs(7)) {
      const b = policyRoute("round_robin", r, backends, state)
      picks.push(b?.id ?? "none")
    }
    expect(picks).toEqual(["b-0", "b-1", "b-2", "b-0", "b-1", "b-2", "b-0"])
  })
})

describe("least_connections", () => {
  it("picks the backend with the minimum open connections", () => {
    const backends = withField(
      withField([makeBackend("b-0"), makeBackend("b-1"), makeBackend("b-2")], 0, {
        connections: 5,
      }),
      2,
      { connections: 3 },
    )
    const state = makeRouter()
    const pick = policyRoute("least_connections", { id: "x", cost: 1 }, backends, state)
    expect(pick?.id).toBe("b-1")
  })

  it("keeps piling onto the idle pad until it is no longer the min", () => {
    const backends = withField([makeBackend("b-0"), makeBackend("b-1")], 0, {
      connections: 4,
    })
    const state = makeRouter()
    const picks: string[] = []
    for (const r of reqs(4)) {
      const b = policyRoute("least_connections", r, backends, state)
      picks.push(b?.id ?? "none")
    }
    // b-1 takes the first (conn 0->1, still < 4), takes the 2nd (1->2), 3rd (2->3), then 4th ties
    // at 3 vs 4 so still b-1. Only when b-1.connections >= b-0.connections does it switch.
    expect(picks).toEqual(["b-1", "b-1", "b-1", "b-1"])
    expect(backends[1]?.connections).toBe(4)
    // next request now ties (4 vs 4) — first-min-wins keeps b-0 chosen only after b-1 exceeds it
    const next = policyRoute("least_connections", { id: "y", cost: 1 }, backends, state)
    expect(next?.id).toBe("b-0")
  })

  it("releases connections so the min shifts back", () => {
    const backends = withField(
      withField([makeBackend("b-0"), makeBackend("b-1")], 0, { connections: 2 }),
      1,
      { connections: 2 },
    )
    const b0 = backends[0]
    if (b0) release(b0, 2) // b-0 back to idle
    const state = makeRouter()
    const pick = policyRoute("least_connections", { id: "x", cost: 1 }, backends, state)
    expect(pick?.id).toBe("b-0")
  })
})

describe("health checks", () => {
  it("unhealthy backends get zero routes under any policy", () => {
    for (const policy of ["round_robin", "least_connections", "random"] as const) {
      const backends = withField(
        [makeBackend("b-0"), makeBackend("b-1"), makeBackend("b-2")],
        1,
        { health: "unhealthy" }, // the dead pad
      )
      const rng = mulberry32(99)
      const result = routeWave({
        policy,
        requests: reqs(30),
        backends,
        state: makeRouter(),
        rng,
      })
      expect(result.load.get("b-1")).toBe(0)
      expect(backends[1]?.routed).toBe(0)
      expect(result.errors).toBe(0) // policy never routed to the unhealthy pad
    }
  })

  it("returns null (dropped) when every backend is unhealthy", () => {
    const backends = [makeBackend("b-0"), makeBackend("b-1")]
    for (const b of backends) b.health = "unhealthy"
    const pick = policyRoute("round_robin", { id: "x", cost: 1 }, backends, makeRouter())
    expect(pick).toBeNull()
  })

  it("a probe can flip health, and recovery re-adds the pad to rotation", () => {
    const rng = mulberry32(7)
    const b = makeBackend("b-0")
    // force a failure: with failProb=1 a healthy probe always fails.
    expect(probe(b, rng, 1, 0)).toBe("unhealthy")
    // recovery: with recoverProb=1 an unhealthy probe always recovers.
    expect(probe(b, rng, 0, 1)).toBe("healthy")
  })
})

describe("determinism", () => {
  it("same seed ⇒ same routing decisions for every policy", () => {
    for (const policy of ["round_robin", "least_connections", "random"] as const) {
      const runA = oneRun(policy, 1)
      const runB = oneRun(policy, 1)
      expect([...runA.assignments.entries()]).toEqual([...runB.assignments.entries()])
      expect(runA.skew).toBe(runB.skew)
    }
  })

  it("round-robin on healthy-only set is deterministic regardless of seed (pure order)", () => {
    const a = oneRun("round_robin", 123)
    const b = oneRun("round_robin", 999)
    expect([...a.assignments.entries()]).toEqual([...b.assignments.entries()])
  })
})

describe("player overrides & errors (the lesson of L2/L3)", () => {
  it("routing to an unhealthy backend (ignoring health) counts as an error", () => {
    const backends = withField([makeBackend("b-0"), makeBackend("b-1")], 1, {
      health: "unhealthy",
    })
    const overrides = new Map([["req-0", "b-1"]]) // player forces the dead pad
    const result = routeWave({
      policy: "round_robin",
      requests: reqs(3),
      backends,
      state: makeRouter(),
      rng: mulberry32(1),
      overrides,
    })
    expect(result.errors).toBe(1)
    expect(backends[1]?.errors).toBe(1)
    // the other two requests still round-robin onto the healthy pad b-0
    expect(backends[0]?.routed).toBe(2)
  })
})

describe("load skew", () => {
  it("round-robin yields skew ≈ 1.0 on an all-healthy ring", () => {
    const result = oneRun("round_robin", 5)
    expect(result.skew).toBeCloseTo(1, 1)
  })

  it("random is more skewed than round-robin on the same stream", () => {
    const rr = oneRun("round_robin", 5, 120)
    const rand = oneRun("random", 5, 120)
    // round-robin is perfectly even; random is at least as skewed, usually more.
    expect(rand.skew).toBeGreaterThanOrEqual(rr.skew)
  })
})

function oneRun(policy: "round_robin" | "least_connections" | "random", seed: number, n = 60) {
  const backends = [makeBackend("b-0"), makeBackend("b-1"), makeBackend("b-2")]
  const requests = requestStream(mulberry32(seed), n)
  return routeWave({
    policy,
    requests,
    backends,
    state: makeRouter(),
    rng: mulberry32(seed),
  })
}
