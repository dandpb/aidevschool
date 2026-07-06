import { describe, expect, it } from "vitest"
import {
  bucketIndex,
  makeHistogram,
  mean,
  percentile,
  quantileFromCounts,
  record,
  recordAll,
  reset,
  setAlert,
} from "./histogram"
import { mulberry32, sampleStream } from "./rng"

describe("record increments the right bucket", () => {
  it("places each value in the bucket whose boundaries straddle it", () => {
    const h = makeHistogram(8) // boundaries 0.125, 0.25, ... 1.0
    expect(record(h, 0.0)).toBe(0) // <= 0.125
    expect(record(h, 0.1)).toBe(0)
    expect(record(h, 0.125)).toBe(0) // boundary inclusive
    expect(record(h, 0.126)).toBe(1) // (0.125, 0.25]
    expect(record(h, 0.5)).toBe(3) // (0.375, 0.5]
    expect(record(h, 0.999)).toBe(7) // (0.875, 1.0]
    expect(record(h, 1.0)).toBe(7) // exactly 1.0 → last finite bucket
    expect(record(h, 1.5)).toBe(8) // +∞ overflow bucket
    expect(h.total).toBe(8) // 8 record() calls above
    expect(h.counts).toEqual([3, 1, 0, 1, 0, 0, 0, 2, 1])
  })

  it("bucketIndex maps values without mutating state", () => {
    const h = makeHistogram(4, 1) // boundaries 0.25, 0.5, 0.75, 1.0
    expect(bucketIndex(h, -1)).toBe(0)
    expect(bucketIndex(h, 0.3)).toBe(1)
    expect(bucketIndex(h, 0.8)).toBe(3)
    expect(bucketIndex(h, 99)).toBe(4)
    expect(h.total).toBe(0) // untouched
  })

  it("reset clears counts and total but keeps the layout", () => {
    const h = makeHistogram(4)
    recordAll(h, [0.1, 0.2, 0.3])
    expect(h.total).toBe(3)
    reset(h)
    expect(h.total).toBe(0)
    expect(h.counts.every((c) => c === 0)).toBe(true)
    expect(h.boundaries.length).toBe(4)
  })
})

describe("percentile returns the correct value for known distributions", () => {
  it("uniform stream → p50 ≈ mid, p95 ≈ high, p99 ≈ higher", () => {
    const h = makeHistogram(8)
    // 8000 uniform samples in [0,1): every bucket ≈ 1000 counts.
    recordAll(h, sampleStream(mulberry32(1), 8000))
    const p50 = percentile(h, 50)
    const p95 = percentile(h, 95)
    const p99 = percentile(h, 99)
    expect(p50).toBeGreaterThan(0.45)
    expect(p50).toBeLessThan(0.55)
    expect(p95).toBeGreaterThan(0.85)
    expect(p95).toBeLessThan(1.0)
    expect(p99).toBeGreaterThanOrEqual(p95) // monotonic
  })

  it("a fat tail lifts p99 but barely moves p50 (the tail lesson)", () => {
    const h = makeHistogram(8)
    // 90 samples in the first bucket + 10 spikes at the top → p50 low, p99 chases the tail.
    for (let i = 0; i < 90; i++) record(h, 0.05)
    for (let i = 0; i < 10; i++) record(h, 1.0)
    expect(percentile(h, 50)).toBeLessThan(0.2) // median stays low
    expect(percentile(h, 99)).toBeGreaterThanOrEqual(0.9) // p99 chases the tail
  })

  it("clamps q in the overflow bucket to the top finite boundary", () => {
    const h = makeHistogram(4) // boundaries 0.25..1.0
    recordAll(h, [1.5, 1.5, 1.5]) // all in +∞ overflow bucket
    // p50 of {1.5,1.5,1.5} is 1.5 but we cannot represent > top boundary → clamp to 1.0
    expect(percentile(h, 50)).toBe(1.0)
  })

  it("returns NaN for an empty histogram, and is monotonic in p", () => {
    const h = makeHistogram(8)
    expect(percentile(h, 50)).toBeNaN()
    recordAll(h, sampleStream(mulberry32(2), 400))
    let prev = -Infinity
    for (const p of [1, 10, 25, 50, 75, 90, 95, 99]) {
      const v = percentile(h, p)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it("quantileFromCounts interpolates within a bucket (Prometheus-style)", () => {
    // 4 buckets of width 0.25: counts [0, 10, 0, 0, 0]. q=0.5 → rank 5 lands in bucket 1 (0.25,0.5].
    // lo=0.25, hi=0.5, frac=(5-0)/10=0.5 → 0.25 + 0.25*0.5 = 0.375
    const v = quantileFromCounts([0, 10, 0, 0, 0], [0.25, 0.5, 0.75, 1.0], 0.5)
    expect(v).toBe(0.375)
  })
})

describe("alert fires when p95 > SLO and is silent below", () => {
  it("a low-tail stream stays silent under a permissive SLO", () => {
    const h = makeHistogram(8)
    recordAll(h, sampleStream(mulberry32(3), 2000)) // uniform, p95 ≈ 0.93
    const silent = setAlert(h, 0.95, 95)
    expect(silent.firing).toBe(false)
    expect(silent.observedP).toBeLessThanOrEqual(0.95)
  })

  it("a fat-tail (skewed) stream trips the alert under the same SLO", () => {
    const h = makeHistogram(8)
    recordAll(h, sampleStream(mulberry32(4), 2000, 0.9)) // power-skewed → p95 pushed near 1.0
    const firing = setAlert(h, 0.7, 95)
    expect(firing.firing).toBe(true)
    expect(firing.observedP).toBeGreaterThan(0.7)
  })

  it("the alert is strictly `>`: at exactly the SLO it is silent", () => {
    // Construct a histogram whose p95 lands exactly on 0.5: 95 samples at/below 0.5, 5 above.
    const h = makeHistogram(4) // boundaries 0.25, 0.5, 0.75, 1.0
    for (let i = 0; i < 95; i++) record(h, 0.5) // bucket 1 (0.25,0.5]
    for (let i = 0; i < 5; i++) record(h, 1.0) // bucket 3
    const edge = setAlert(h, percentile(h, 95), 95)
    expect(edge.observedP).toBeCloseTo(0.5, 5)
    expect(edge.firing).toBe(false) // not strictly greater
  })
})

describe("two distributions with the same mean but different p95 (the L4 lesson)", () => {
  it("averages can agree while the tails disagree", () => {
    // Tight distribution: all samples near 0.5 → p95 ≈ 0.5.
    const tight = makeHistogram(8)
    // Fat distribution: half the samples at 0, half at 1.0 → same mean ≈ 0.5 but p95 ≈ 1.0.
    const fat = makeHistogram(8)
    for (let i = 0; i < 1000; i++) {
      record(tight, 0.45 + ((i % 10) / 10) * 0.1) // 0.45..0.54
      record(fat, i % 2 === 0 ? 0.0 : 1.0)
    }
    expect(mean(tight)).toBeCloseTo(mean(fat), 1) // ≈ 0.5 both
    expect(percentile(tight, 95)).toBeLessThan(0.7)
    expect(percentile(fat, 95)).toBeGreaterThan(0.9) // the tail the average hides
  })
})

describe("determinism: same seed ⇒ same stream ⇒ same percentile", () => {
  it("two histograms fed the same seeded stream agree on every percentile", () => {
    const a = makeHistogram(8)
    const b = makeHistogram(8)
    recordAll(a, sampleStream(mulberry32(42), 5000, 0.5))
    recordAll(b, sampleStream(mulberry32(42), 5000, 0.5))
    for (const p of [50, 95, 99]) {
      expect(percentile(a, p)).toBe(percentile(b, p))
    }
    expect(a.counts).toEqual(b.counts)
  })
})
