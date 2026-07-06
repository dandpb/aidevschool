import { describe, expect, it } from "vitest"
import {
  type AlertState,
  BUCKET_BOUNDS,
  bucketForValue,
  Observatory,
  percentileBucket,
} from "./observatory"
import { EXPECTED_WAVE_1_SUM, WAVE_1 } from "./wave"

describe("bucketForValue (RF-003)", () => {
  it("routes to the smallest `le >= value` bucket", () => {
    expect(bucketForValue(0)).toBe(0) // le=5
    expect(bucketForValue(5)).toBe(0) // boundary inclusive
    expect(bucketForValue(6)).toBe(1) // le=10
    expect(bucketForValue(42)).toBe(3) // le=50
    expect(bucketForValue(100)).toBe(4) // boundary
    expect(bucketForValue(101)).toBe(5) // le=250
    expect(bucketForValue(499)).toBe(6) // le=500
    expect(bucketForValue(500)).toBe(6)
    expect(bucketForValue(501)).toBe(7) // +Inf sink
    expect(bucketForValue(10_000)).toBe(7)
  })

  it("always lands somewhere — +Inf is the universal sink", () => {
    for (const v of [-1, 0, 1, 1e6]) {
      expect(bucketForValue(v)).toBeGreaterThanOrEqual(0)
      expect(bucketForValue(v)).toBeLessThan(BUCKET_BOUNDS.length)
    }
  })
})

describe("percentileBucket (RF-008/009)", () => {
  it("returns -1 when the histogram is empty", () => {
    expect(percentileBucket([0, 0, 0, 0, 0, 0, 0, 0], 0, 0.95)).toBe(-1)
  })

  it("picks the smallest cumulative bucket containing the rank", () => {
    // cumulative [1,2,3,4,6,9,11,12] — the canonical wave-1 distribution
    const cumulative = [1, 2, 3, 4, 6, 9, 11, 12]
    const total = 12
    // p50 rank = ceil(0.5*12) = 6 -> first cum >= 6 is idx 4
    expect(percentileBucket(cumulative, total, 0.5)).toBe(4)
    // p95 rank = ceil(0.95*12) = 12 -> idx 7
    expect(percentileBucket(cumulative, total, 0.95)).toBe(7)
    // p99 rank = 12 -> idx 7
    expect(percentileBucket(cumulative, total, 0.99)).toBe(7)
    // p25 rank = 3 -> idx 2
    expect(percentileBucket(cumulative, total, 0.25)).toBe(2)
  })

  it("is rank-based, not an average — the spec's NFR-005 approximation", () => {
    // Eight observations all in le=5 (idx 0): cumulative stays at 8 from idx 0 on,
    // so p95 lands at idx 0 regardless of how the values inside the bucket spread.
    const cumulative = [8, 8, 8, 8, 8, 8, 8, 8]
    expect(percentileBucket(cumulative, 8, 0.95)).toBe(0)
  })
})

describe("Observatory — observation routing + sum", () => {
  it("auto-routes when no bucket choice is given (used by the deterministic test hook)", () => {
    const o = new Observatory()
    const r = o.routeObservation(42)
    expect(r.correct).toBe(true)
    expect(r.expectedIdx).toBe(3)
    expect(o.snapshot.bucketCounts[3]).toBe(1)
    expect(o.snapshot.sumRecorded).toBe(42)
    expect(o.snapshot.sumObserved).toBe(42)
  })

  it("accepts a correct player choice and counts it", () => {
    const o = new Observatory()
    o.routeObservation(75, 4) // le=100
    expect(o.snapshot.obsBucketedCorrect).toBe(1)
    expect(o.snapshot.obsMisbucketed).toBe(0)
  })

  it("rejects a wrong player choice: orb not counted, sum drift appears", () => {
    const o = new Observatory()
    o.routeObservation(75, 0) // wrong — should be le=100 (idx 4)
    const s = o.snapshot
    expect(s.obsMisbucketed).toBe(1)
    expect(s.obsBucketedCorrect).toBe(0)
    expect(s.total).toBe(0)
    expect(s.sumRecorded).toBe(0)
    expect(s.sumObserved).toBe(75) // the value flowed through, but the recorder missed it
  })

  it("reproduces the wave-1 distribution and sum after routing all 12 obs", () => {
    const o = new Observatory({ windowSeconds: WAVE_1.windowSeconds })
    for (const v of WAVE_1.observations) o.routeObservation(v)
    const s = o.snapshot
    expect(s.bucketCounts).toEqual([1, 1, 1, 1, 2, 3, 2, 1])
    expect(s.cumulativeCounts).toEqual([1, 2, 3, 4, 6, 9, 11, 12])
    expect(s.total).toBe(12)
    expect(s.sumRecorded).toBe(EXPECTED_WAVE_1_SUM)
    expect(s.sumObserved).toBe(EXPECTED_WAVE_1_SUM)
    expect(o.queryPercentile(0.5)).toBe(4)
    expect(o.queryPercentile(0.95)).toBe(7)
    expect(o.queryPercentile(0.99)).toBe(7)
  })
})

describe("Observatory — alert lifecycle (RF-014/015)", () => {
  function routed(): Observatory {
    const o = new Observatory({ windowSeconds: 30, alertHoldSeconds: 4 })
    for (const v of WAVE_1.observations) o.routeObservation(v)
    return o
  }

  it("is inert until a threshold is set", () => {
    const o = routed()
    o.tick(10)
    expect(o.snapshot.alertState).toBe("inactive" as AlertState)
    expect(o.snapshot.alertLifecycle).toEqual([])
  })

  it("goes pending when p95 pierces the threshold, then firing after the hold", () => {
    const o = routed()
    o.setAlertThreshold(4) // le=100 — p95 (idx 7) pierces
    o.tick(1)
    expect(o.snapshot.alertState).toBe("pending")
    expect(o.snapshot.alertLifecycle).toEqual(["pending"])
    // transition into pending resets the hold timer; tick the full 4s hold.
    o.tick(4)
    expect(o.snapshot.alertState).toBe("firing")
    expect(o.snapshot.alertLifecycle).toEqual(["pending", "firing"])
  })

  it("drops back to inactive if the breach ends before the hold (no spurious firing)", () => {
    const o = routed()
    o.setAlertThreshold(4)
    o.tick(1) // pending
    expect(o.snapshot.alertState).toBe("pending")
    // p95 falls: clear the histogram by aging everything out
    o.tick(31) // past 30s window
    expect(o.snapshot.alertState).toBe("inactive")
    expect(o.snapshot.alertLifecycle).toEqual([]) // pending that never fired is dropped
  })

  it("reaches resolved after firing when obs age out of the window", () => {
    const o = routed()
    o.setAlertThreshold(4)
    o.tick(1) // pending
    o.tick(4) // firing (hold satisfied)
    expect(o.snapshot.alertState).toBe("firing")
    o.tick(31) // 30s window empties -> no data -> not breaching -> resolved
    expect(o.snapshot.alertState).toBe("resolved")
    expect(o.snapshot.alertLifecycle).toEqual(["pending", "firing", "resolved"])
  })

  it("ackAlert is a no-op before resolved (the runbook lesson)", () => {
    const o = routed()
    o.setAlertThreshold(4)
    o.tick(1) // pending
    const pending = o.ackAlert()
    expect(pending.valid).toBe(false)
    o.tick(4) // firing
    const firing = o.ackAlert()
    expect(firing.valid).toBe(false)
    o.tick(31) // resolved
    const ok = o.ackAlert()
    expect(ok.valid).toBe(true)
    expect(o.snapshot.acked).toBe(true)
  })
})

describe("Observatory — overflow (NFR-004)", () => {
  it("rejects observations past the queue cap with overflow: true", () => {
    const o = new Observatory({ maxQueueLength: 3 })
    o.routeObservation(1)
    o.routeObservation(2)
    o.routeObservation(3)
    const r = o.routeObservation(4)
    expect(r.overflow).toBe(true)
    expect(r.accepted).toBe(false)
    expect(o.snapshot.overflowDrops).toBe(1)
    expect(o.snapshot.total).toBe(3)
  })
})
