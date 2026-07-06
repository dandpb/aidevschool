/**
 * Headless histogram + percentile + alert core. ZERO `three` imports — all rules live here and
 * are unit-tested in node. The Three.js scene only reads these outputs.
 *
 * Bucket model: `boundaries` are the exclusive upper bounds of each finite bucket; values fall in
 * bucket `i` iff `boundaries[i-1] < value <= boundaries[i]` (bucket 0 is `value <= boundaries[0]`).
 * `counts` has length `boundaries.length + 1`: the last entry is the +∞ overflow bucket for values
 * above the top boundary. `total` is the sum of all counts.
 *
 * Percentiles use Prometheus-style linear interpolation across cumulative bucket counts: find the
 * bucket that holds the target rank, then interpolate linearly between that bucket's lower and upper
 * bound by the intra-bucket fraction of the rank.
 */

export interface Histogram {
  /** exclusive upper bounds of the finite buckets, ascending. The +∞ bucket is implicit. */
  readonly boundaries: readonly number[]
  /** per-bucket counts; `counts[i]` is the count for bucket `i`; length = boundaries.length + 1. */
  counts: number[]
  /** total samples recorded. */
  total: number
}

/** Build a histogram with `nBuckets` equal-width finite buckets over [0, upper]. */
export function makeHistogram(nBuckets: number, upper = 1): Histogram {
  if (nBuckets < 1) throw new Error("need at least one bucket")
  const step = upper / nBuckets
  const boundaries: number[] = []
  for (let i = 1; i <= nBuckets; i++) boundaries.push(round6(step * i))
  return { boundaries, counts: new Array<number>(nBuckets + 1).fill(0), total: 0 }
}

/** Index of the bucket a value falls into (the last index is the +∞ overflow bucket). */
export function bucketIndex(h: Histogram, value: number): number {
  const { boundaries } = h
  for (let i = 0; i < boundaries.length; i++) {
    if (value <= (boundaries[i] as number)) return i
  }
  return boundaries.length // +∞ overflow bucket
}

/** Record one sample: increments the right bucket and the total. Returns the bucket index. */
export function record(h: Histogram, value: number): number {
  const idx = bucketIndex(h, value)
  ;(h.counts[idx] as number) += 1
  h.total += 1
  return idx
}

/** Record many samples at once (convenience for level seeding). */
export function recordAll(h: Histogram, values: readonly number[]): void {
  for (const v of values) record(h, v)
}

/** Reset to an empty histogram (keeps the bucket layout). */
export function reset(h: Histogram): void {
  h.counts.fill(0)
  h.total = 0
}

/**
 * The shared percentile interpolation kernel. `q` is a quantile in [0, 1].
 * Returns the interpolated value `v` such that approximately `q` of the mass lies at or below `v`.
 *
 * Algorithm (Prometheus `histogram_quantile` family): walk cumulative counts; once the running
 * total reaches/exceeds the target rank `q*total`, the value lies in this bucket. Interpolate
 * linearly between the bucket's lower bound and upper bound by the fraction of the target rank that
 * falls inside the bucket. Clamps to the top finite boundary for q in the overflow bucket.
 */
export function quantileFromCounts(
  counts: readonly number[],
  boundaries: readonly number[],
  q: number,
): number {
  if (q < 0 || q > 1) throw new Error("quantile must be in [0,1]")
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return NaN
  if (q <= 0) return lowerBoundOf(0, boundaries)
  const rank = q * total
  let running = 0
  for (let i = 0; i < counts.length; i++) {
    const prev = running
    running += counts[i] as number
    if (running >= rank) {
      const lo = lowerBoundOf(i, boundaries)
      const hi = upperBoundOf(i, boundaries)
      const bucketCount = counts[i] as number
      if (bucketCount === 0) return hi // empty bucket — jump to its upper bound
      // intra-bucket fraction: how far into this bucket the target rank sits.
      const frac = (rank - prev) / bucketCount
      return round6(lo + (hi - lo) * frac)
    }
  }
  // rank falls in the +∞ overflow bucket → clamp to the top finite boundary.
  return round6(boundaries[boundaries.length - 1] as number)
}

/** Percentile value for `p` in [0, 100]. p50 = median, p95, p99. */
export function percentile(h: Histogram, p: number): number {
  return quantileFromCounts(h.counts, h.boundaries, p / 100)
}

/** Lower bound of bucket `i` (0 for the first bucket; the previous boundary otherwise). */
function lowerBoundOf(i: number, boundaries: readonly number[]): number {
  if (i === 0) return 0
  return boundaries[i - 1] as number
}

/** Upper bound of bucket `i` (its boundary, or +∞ represented as the top boundary for overflow). */
function upperBoundOf(i: number, boundaries: readonly number[]): number {
  if (i >= boundaries.length) return boundaries[boundaries.length - 1] as number
  return boundaries[i] as number
}

/** Arithmetic mean of the recorded samples, reconstructed from buckets at bucket midpoints. */
export function mean(h: Histogram): number {
  if (h.total === 0) return NaN
  let sum = 0
  for (let i = 0; i < h.counts.length; i++) {
    const lo = lowerBoundOf(i, h.boundaries)
    const hi = upperBoundOf(i, h.boundaries)
    const mid = (lo + hi) / 2
    sum += mid * (h.counts[i] as number)
  }
  return round6(sum / h.total)
}

export interface AlertState {
  /** true iff the observed percentile strictly exceeds the SLO threshold. */
  firing: boolean
  /** the percentile value the alert watches (e.g. the p95). */
  observedP: number
  /** the SLO threshold the percentile is compared against. */
  slo: number
  /** which percentile (0..100) the alert watches. */
  p: number
}

/**
 * Evaluate an SLO alert: `firing` iff `percentile(h, p) > slo`. This is the core lesson — a
 * percentile, read off the histogram shape, is compared to a threshold line. Averages can hide
 * this crossing; percentiles cannot.
 */
export function setAlert(h: Histogram, slo: number, p: number): AlertState {
  const observedP = percentile(h, p)
  return { firing: observedP > slo, observedP, slo, p }
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6
}
