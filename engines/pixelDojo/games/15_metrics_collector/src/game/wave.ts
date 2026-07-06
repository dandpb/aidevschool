// Wave 1 contract for the Metrics Observatory.
//
// The plan slice narrows the catalog row to ONE concept: histogram bucketing
// → percentile estimation from cumulative counts → alert lifecycle. This wave
// exercises every leg of that flow with a deterministic seed so the smoke
// spec and a human player see the same data.

export interface WaveContract {
  readonly id: string
  readonly title: string
  readonly lesson: string
  readonly bucketBounds: readonly number[]
  /** Index into bucketBounds the player must lift the alert plane to. */
  readonly alertThresholdIdx: number
  readonly alertThresholdLabel: string
  readonly holdSeconds: number
  readonly windowSeconds: number
  /** Observation values in arrival order. */
  readonly observations: readonly number[]
  /** Percentile queries the player must answer (0..1). */
  readonly percentileQueries: readonly number[]
}

// Wave 1 — 12 obs, threshold `le=100`, hold 4s, window 30s.
// Routing rule (smallest le >= value) gives the cumulative counts below; the
// wave is calibrated so p95 lands at idx 7 (+Inf) — well above the threshold
// idx 4 — and a 31s tick past the 30s window empties the active set so p95
// drops to "no data" and the alert resolves.
//
// Cumulative after all 12 obs routed:
//   idx 0 (le=5):    1     idx 4 (le=100):  6
//   idx 1 (le=10):   2     idx 5 (le=250):  9
//   idx 2 (le=25):   3     idx 6 (le=500): 11
//   idx 3 (le=50):   4     idx 7 (+Inf):   12
//
// p50 rank=6 -> idx 4   p95 rank=12 -> idx 7   p99 rank=12 -> idx 7
// sum_observed = sum_recorded = 2201

export const WAVE_1: WaveContract = {
  id: "metrics-collector-L1",
  title: "Wave 1 — Metrics Observatory",
  lesson:
    "Route each latency orb to the smallest `le >= value` bucket, read p50/p95/p99 from the cumulative ribbon, and watch the alert go pending -> firing -> resolved.",
  bucketBounds: [5, 10, 25, 50, 100, 250, 500, Infinity],
  alertThresholdIdx: 4,
  alertThresholdLabel: "le=100",
  holdSeconds: 4,
  windowSeconds: 30,
  observations: [3, 8, 15, 35, 75, 95, 120, 180, 240, 380, 450, 600],
  percentileQueries: [0.5, 0.95, 0.99],
}

export const EXPECTED_WAVE_1_SUM = 2201
