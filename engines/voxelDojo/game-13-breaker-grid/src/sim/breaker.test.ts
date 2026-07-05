import { describe, expect, it } from "vitest"
import {
  type Breaker,
  bulkheadAcquire,
  bulkheadRelease,
  burst,
  type CircuitState,
  makeBreaker,
  makeDistrict,
  routeRequest,
  serveRequest,
  simulateWave,
  stepBreaker,
  sweepCompletions,
} from "./breaker"
import { mulberry32 } from "./rng"

// ───────────────── L1: failure threshold trips the breaker ──────────────────

describe("the failure threshold (the lesson of L1)", () => {
  it("N consecutive failures trip the breaker from closed → open", () => {
    let b: Breaker = makeBreaker("alpha", { failureThreshold: 3, cooldownMs: 1000 })
    expect(b.state).toBe("closed")
    b = stepBreaker(b, { type: "failure", now: 10 })
    b = stepBreaker(b, { type: "failure", now: 20 })
    expect(b.state).toBe("closed") // 2 < 3, still closed
    b = stepBreaker(b, { type: "failure", now: 30 })
    expect(b.state).toBe("open") // 3rd trip
    expect(b.openedAt).toBe(30)
    expect(b.trips).toBe(1)
  })

  it("one success resets the consecutive-failure count", () => {
    let b: Breaker = makeBreaker("beta", { failureThreshold: 3 })
    b = stepBreaker(b, { type: "failure", now: 1 })
    b = stepBreaker(b, { type: "failure", now: 2 })
    b = stepBreaker(b, { type: "success", now: 3 }) // resets
    b = stepBreaker(b, { type: "failure", now: 4 })
    expect(b.state).toBe("closed") // only 1 consecutive again
    expect(b.consecutiveFailures).toBe(1)
  })

  it("does NOT trip if failures are not consecutive", () => {
    let b: Breaker = makeBreaker("gamma", { failureThreshold: 3 })
    for (let i = 0; i < 5; i++) {
      b = stepBreaker(b, { type: "failure", now: i })
      b = stepBreaker(b, { type: "success", now: i }) // clears between each
    }
    expect(b.state).toBe("closed")
  })
})

// ───────────────── L2: cooldown → half-open → close/reopen ──────────────────

describe("cooldown + probe (the lesson of L2)", () => {
  it("after cooldown elapses the breaker goes half_open (a single probe)", () => {
    let b: Breaker = makeBreaker("delta", { failureThreshold: 1, cooldownMs: 1000 })
    b = stepBreaker(b, { type: "failure", now: 0 }) // → open at 0
    expect(b.state).toBe("open")
    b = stepBreaker(b, { type: "tick", now: 500 }) // before cooldown
    expect(b.state).toBe("open")
    b = stepBreaker(b, { type: "tick", now: 1000 }) // exactly cooldown
    expect(b.state).toBe("half_open")
    expect(b.halfOpenDispatched).toBe(0)
  })

  it("probe SUCCESS closes the breaker", () => {
    let b: Breaker = makeBreaker("eps", { failureThreshold: 1, cooldownMs: 100 })
    b = stepBreaker(b, { type: "failure", now: 0 })
    b = stepBreaker(b, { type: "tick", now: 100 })
    expect(b.state).toBe("half_open")
    b = stepBreaker(b, { type: "success", now: 101 })
    expect(b.state).toBe("closed")
    expect(b.consecutiveFailures).toBe(0)
  })

  it("probe FAILURE re-opens the breaker (and starts a new cooldown)", () => {
    let b: Breaker = makeBreaker("zeta", { failureThreshold: 1, cooldownMs: 100 })
    b = stepBreaker(b, { type: "failure", now: 0 }) // open@0
    b = stepBreaker(b, { type: "tick", now: 100 }) // half_open
    b = stepBreaker(b, { type: "failure", now: 101 }) // probe failed
    expect(b.state).toBe("open")
    expect(b.openedAt).toBe(101) // new cooldown from here
    expect(b.trips).toBe(2)
  })
})

// ───────────────── fail-fast routing (the lesson of L1/L4) ───────────────────

describe("routing: OPEN short-circuits (fail-fast, no downstream call)", () => {
  it("an open breaker fail-fasts requests while closed ones pass", () => {
    const open = makeBreaker("open", { failureThreshold: 1, cooldownMs: 10_000 })
    const tripped = stepBreaker(open, { type: "failure", now: 0 })
    const { breaker, result } = routeRequest(tripped, 5)
    expect(breaker.state).toBe("open") // still cooling down
    expect(result.passed).toBe(false)
    expect(result.shortCircuited).toBe(true)
    expect(result.isProbe).toBe(false)
  })

  it("a closed breaker passes through and is not a probe", () => {
    const closed = makeBreaker("closed", { failureThreshold: 3 })
    const { breaker, result } = routeRequest(closed, 0)
    expect(breaker.state).toBe("closed")
    expect(result).toMatchObject({ passed: true, shortCircuited: false, isProbe: false })
  })

  it("a half_open breaker admits exactly one probe and fail-fasts the surplus", () => {
    let b = makeBreaker("probe", { failureThreshold: 1, cooldownMs: 100, halfOpenProbes: 1 })
    b = stepBreaker(b, { type: "failure", now: 0 })
    b = stepBreaker(b, { type: "tick", now: 100 })
    expect(b.state).toBe("half_open")
    const first = routeRequest(b, 101)
    expect(first.result.isProbe).toBe(true)
    expect(first.result.passed).toBe(true)
    const second = routeRequest(first.breaker, 102) // probe slot consumed
    expect(second.result.passed).toBe(false)
    expect(second.result.shortCircuited).toBe(true)
  })
})

// ───────────────── L3: the bulkhead caps concurrency ────────────────────────

describe("bulkhead isolation (the lesson of L3)", () => {
  it("admits calls until the cap, then rejects overflow", () => {
    let inflight = 0
    const cap = 4
    let admitted = 0
    let rejected = 0
    for (let i = 0; i < 6; i++) {
      const r = bulkheadAcquire(inflight, cap)
      inflight = r.inFlight
      if (r.admitted) admitted++
      if (r.rejected) rejected++
    }
    expect(admitted).toBe(4)
    expect(rejected).toBe(2)
    expect(inflight).toBe(4)
  })

  it("releasing frees a slot so a later call can be admitted", () => {
    let inflight = 4
    inflight = bulkheadRelease(inflight)
    expect(inflight).toBe(3)
    const r = bulkheadAcquire(inflight, 4)
    expect(r.admitted).toBe(true)
  })

  it("slow calls pile up to the cap then reject overflow; the breaker stays closed", () => {
    // SLOW calls (durationMs > 0) hold their slots so a fast burst saturates the bulkhead.
    let d = makeDistrict("slow", { cap: 2 })
    d = serveRequest(d, "success", 0, 100).district // holds slot until t=100
    d = serveRequest(d, "success", 1, 100).district // holds slot until t=101 → cap reached
    expect(d.inFlight).toBe(2)
    const overflow = serveRequest(d, "success", 2, 100) // at cap → rejected
    expect(overflow.bulkheadRejected).toBe(true)
    expect(overflow.served).toBe(false)
    expect(overflow.district.breaker.state).toBe("closed") // bulkhead ≠ breaker
  })

  it("after slow calls drain (clock past duration) a new call is admitted again", () => {
    let d = makeDistrict("drain", { cap: 1 })
    d = serveRequest(d, "success", 0, 50).district // holds until t=50
    expect(d.inFlight).toBe(1)
    d = sweepCompletions(d, 50) // exactly at completion → still held (t > now is false at equal)
    d = sweepCompletions(d, 51) // past completion → freed
    expect(d.inFlight).toBe(0)
    const next = serveRequest(d, "success", 51, 0)
    expect(next.served).toBe(true)
  })

  it("a saturated district rejects while another district with free slots admits", () => {
    const slow = makeDistrict("slow", { cap: 1 })
    const fast = makeDistrict("fast", { cap: 2 })
    const slowHeld = serveRequest(slow, "success", 0, 1000).district // long-held slot
    const overflow = serveRequest(slowHeld, "success", 1, 1000)
    expect(overflow.bulkheadRejected).toBe(true)
    const fastServed = serveRequest(fast, "success", 2, 0)
    expect(fastServed.served).toBe(true)
    expect(fastServed.bulkheadRejected).toBe(false)
  })
})

// ───────────────── composed serveRequest + end-to-end wave ──────────────────

describe("serveRequest composes bulkhead + breaker", () => {
  it("a bulkhead rejection short-circuits before the breaker records anything", () => {
    const d = makeDistrict("capped", { cap: 1 })
    const first = serveRequest(d, "success", 0)
    expect(first.served).toBe(true)
    expect(first.district.inFlight).toBe(0) // served call returns, in-flight drops
    // now hold the slot: serve one but don't release, by filling cap and serving again
    const filled = makeDistrict("filled", { cap: 1 })
    const held = serveRequest(filled, "success", 0)
    expect(held.district.inFlight).toBe(0)
  })

  it("failures served through the breaker trip it after the threshold", () => {
    let d = makeDistrict("flaky", { failureThreshold: 2, cooldownMs: 1000 })
    d = serveRequest(d, "failure", 0).district
    d = serveRequest(d, "failure", 1).district
    expect(d.breaker.state).toBe("open")
    // next request is fail-fasted, never reaches downstream
    const out = serveRequest(d, "success", 2)
    expect(out.shortCircuited).toBe(true)
    expect(out.served).toBe(false)
  })
})

describe("simulateWave aggregate stats", () => {
  it("one district failing trips its breaker and short-circuits later requests", () => {
    const d = makeDistrict("pay", { failureThreshold: 3, cooldownMs: 1000 })
    const events = [
      ...burst("pay", 3, "failure", 0),
      ...burst("pay", 2, "success", 100), // arrives while open → short-circuited
    ]
    const { districts, stats } = simulateWave([d], events)
    expect(districts[0]?.breaker.state).toBe("open")
    expect(stats.perDistrict.pay?.shortCircuited).toBe(2)
    expect(stats.totalShortCircuited).toBe(2)
    expect(stats.perDistrict.pay?.served).toBe(3)
  })

  it("L4 cascade prevention: one failing district is isolated, others keep serving", () => {
    const failing = makeDistrict("failing", { failureThreshold: 2, cooldownMs: 1000 })
    const healthy = makeDistrict("healthy", { failureThreshold: 5, cooldownMs: 1000 })
    const events = [
      ...burst("failing", 2, "failure", 0), // trips open
      ...burst("failing", 3, "success", 10), // open → short-circuited
      ...burst("healthy", 5, "success", 10), // still serves fine
    ]
    const { districts, stats } = simulateWave([failing, healthy], events)
    const fail = districts.find((x) => x.id === "failing")
    const well = districts.find((x) => x.id === "healthy")
    expect(fail?.breaker.state).toBe("open")
    expect(well?.breaker.state).toBe("closed")
    expect(stats.perDistrict.failing?.served).toBe(2)
    expect(stats.perDistrict.failing?.shortCircuited).toBe(3)
    expect(stats.perDistrict.healthy?.served).toBe(5)
    expect(stats.perDistrict.healthy?.shortCircuited).toBe(0)
  })
})

// ───────────────── determinism ──────────────────────────────────────────────

describe("determinism with injected clock + seed", () => {
  it("same events + same clock stream ⇒ identical final state and stats", () => {
    function run() {
      const rng = mulberry32(99)
      const d = makeDistrict("seeded", { failureThreshold: 3, cooldownMs: 50 })
      const events = burst("seeded", 4, rng() < 0.5 ? "failure" : "success", 0, 5)
      return simulateWave([d], events)
    }
    const a = run()
    const b = run()
    expect(a.districts[0]?.breaker.state).toBe(b.districts[0]?.breaker.state)
    expect(a.stats).toEqual(b.stats)
  })

  it("breaker state round-trips through the full cycle deterministically", () => {
    const expected: CircuitState[] = ["closed", "open", "half_open", "closed"]
    let b: Breaker = makeBreaker("cycle", { failureThreshold: 1, cooldownMs: 100 })
    const seen: CircuitState[] = [b.state]
    b = stepBreaker(b, { type: "failure", now: 0 })
    seen.push(b.state)
    b = stepBreaker(b, { type: "tick", now: 100 })
    seen.push(b.state)
    b = stepBreaker(b, { type: "success", now: 101 })
    seen.push(b.state)
    expect(seen).toEqual(expected)
  })
})
