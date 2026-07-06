import { describe, expect, it } from "vitest"
import { CircuitBreaker, DEFAULT_CONFIG, type BreakerConfig } from "./breaker"

// Helper: feed the breaker N closed-phase outcomes and return it.
function feedClosed(
  breaker: CircuitBreaker,
  outcomes: ReadonlyArray<boolean>,
  now = 0,
): CircuitBreaker {
  for (const failed of outcomes) {
    breaker.recordClosedOutcome(failed)
  }
  return breaker
}

describe("CircuitBreaker — CLOSED phase rolling window + threshold (FR-005, FR-006)", () => {
  it("does not cross threshold before minimum_requests is met", () => {
    const breaker = new CircuitBreaker()
    // 1 failure out of 3 requests = 33% — below min_requests=4 anyway.
    feedClosed(breaker, [true, false, false])
    expect(breaker.snapshot(0).closedRequests).toBe(3)
    expect(breaker.failureRate()).toBeCloseTo(1 / 3, 5)
    expect(breaker.thresholdCrossed()).toBe(false)
  })

  it("crosses threshold at exactly 50% with minimum_requests=4 (2 fails / 4 reqs)", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    expect(breaker.failureRate()).toBe(0.5)
    expect(breaker.thresholdCrossed()).toBe(true)
  })

  it("does not cross threshold when rate is below the line", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, false, true, false])
    expect(breaker.failureRate()).toBeCloseTo(0.2, 5)
    expect(breaker.thresholdCrossed()).toBe(false)
  })
})

describe("CircuitBreaker — CLOSED -> OPEN trip (FR-006)", () => {
  it("trips when threshold crossed", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    const result = breaker.trip(1000)
    expect(result.ok).toBe(true)
    expect(result.reason).toBe("ok")
    expect(breaker.state).toBe("OPEN")
  })

  it("refuses to trip before threshold (false-trip guard)", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true])
    const result = breaker.trip(1000)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("threshold_not_crossed")
    expect(breaker.state).toBe("CLOSED")
  })

  it("refuses to trip from a non-CLOSED state", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(1000)
    expect(breaker.state).toBe("OPEN")
    const second = breaker.trip(2000)
    expect(second.ok).toBe(false)
    expect(second.reason).toBe("wrong_state")
  })
})

describe("CircuitBreaker — OPEN cooldown (FR-007)", () => {
  it("cooldown is not done immediately after trip", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(1000)
    expect(breaker.cooldownDone(1000)).toBe(false)
    expect(breaker.cooldownRemaining(1000)).toBe(DEFAULT_CONFIG.openCooldownMs)
  })

  it("cooldown drains over real time", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(1000)
    expect(breaker.cooldownDone(1000 + DEFAULT_CONFIG.openCooldownMs - 1)).toBe(false)
    expect(breaker.cooldownDone(1000 + DEFAULT_CONFIG.openCooldownMs)).toBe(true)
    expect(breaker.cooldownRemaining(1000 + DEFAULT_CONFIG.openCooldownMs)).toBe(0)
  })
})

describe("CircuitBreaker — OPEN -> HALF_OPEN probe (FR-007)", () => {
  it("refuses to probe before cooldown (premature probe guard)", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(1000)
    const result = breaker.probe(1100)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("cooldown_not_done")
    expect(breaker.state).toBe("OPEN")
  })

  it("probes into HALF_OPEN after cooldown", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(1000)
    const result = breaker.probe(1000 + DEFAULT_CONFIG.openCooldownMs)
    expect(result.ok).toBe(true)
    expect(result.reason).toBe("ok")
    expect(breaker.state).toBe("HALF_OPEN")
  })
})

describe("CircuitBreaker — HALF_OPEN probe budget + close (FR-008)", () => {
  it("closes after N consecutive probe successes", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(1000)
    breaker.probe(1000 + DEFAULT_CONFIG.openCooldownMs)
    expect(breaker.consumeProbeSlot()).toBe(true)
    let outcome = breaker.recordProbeOutcome(false, 2000)
    expect(outcome.closed).toBe(false)
    expect(breaker.consumeProbeSlot()).toBe(true)
    outcome = breaker.recordProbeOutcome(false, 2100)
    expect(outcome.closed).toBe(false)
    expect(breaker.consumeProbeSlot()).toBe(true)
    outcome = breaker.recordProbeOutcome(false, 2200)
    expect(outcome.closed).toBe(true)
    expect(breaker.state).toBe("CLOSED")
  })

  it("refuses over-budget probe slots", () => {
    const config: BreakerConfig = {
      failureRateThreshold: 0.5,
      minimumRequests: 4,
      openCooldownMs: 1000,
      halfOpenMaxProbes: 2,
      halfOpenSuccessesToClose: 2,
    }
    const breaker = new CircuitBreaker(config)
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(0)
    breaker.probe(config.openCooldownMs)
    expect(breaker.consumeProbeSlot()).toBe(true)
    expect(breaker.consumeProbeSlot()).toBe(true)
    expect(breaker.consumeProbeSlot()).toBe(false)
  })

  it("snaps back to OPEN on any probe failure and re-lights cooldown", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(1000)
    breaker.probe(1000 + DEFAULT_CONFIG.openCooldownMs)
    breaker.consumeProbeSlot()
    breaker.recordProbeOutcome(false, 2000)
    expect(breaker.state).toBe("HALF_OPEN")
    breaker.consumeProbeSlot()
    const outcome = breaker.recordProbeOutcome(true, 2100)
    expect(outcome.reopened).toBe(true)
    expect(breaker.state).toBe("OPEN")
    // Cooldown re-lit from the failure timestamp.
    expect(breaker.cooldownDone(2100)).toBe(false)
    expect(breaker.cooldownDone(2100 + DEFAULT_CONFIG.openCooldownMs)).toBe(true)
  })

  it("close() refuses from HALF_OPEN before N successes", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    breaker.trip(0)
    breaker.probe(DEFAULT_CONFIG.openCooldownMs)
    expect(breaker.close()).toBe(false)
    expect(breaker.state).toBe("HALF_OPEN")
  })
})

describe("CircuitBreaker — full recovery cycle", () => {
  it("walks CLOSED -> OPEN -> HALF_OPEN -> CLOSED on the happy path", () => {
    const breaker = new CircuitBreaker()
    feedClosed(breaker, [false, false, true, true])
    expect(breaker.thresholdCrossed()).toBe(true)
    expect(breaker.trip(0).ok).toBe(true)
    expect(breaker.state).toBe("OPEN")
    expect(breaker.probe(0).ok).toBe(false)
    expect(breaker.probe(DEFAULT_CONFIG.openCooldownMs).ok).toBe(true)
    expect(breaker.state).toBe("HALF_OPEN")
    breaker.consumeProbeSlot()
    expect(breaker.recordProbeOutcome(false, 5000).closed).toBe(false)
    breaker.consumeProbeSlot()
    expect(breaker.recordProbeOutcome(false, 5100).closed).toBe(false)
    breaker.consumeProbeSlot()
    expect(breaker.recordProbeOutcome(false, 5200).closed).toBe(true)
    expect(breaker.state).toBe("CLOSED")
    // Rolling window resets after close.
    expect(breaker.failureRate()).toBe(0)
  })
})
