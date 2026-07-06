import { type Histogram, makeHistogram, mean, percentile, recordAll } from "./histogram"
import { mulberry32, sampleStream } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

/** Number of equal-width histogram buckets every level uses (over [0, 1]). */
export const N_BUCKETS = 8

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** deterministic seed for the sample-stream RNG */
  seed: number
  /** how many samples drip in (L1 = the predicted stream; L2/L3 = pre-filled). */
  sampleCount: number
  /** power-skew inflating the right tail (0 = uniform). */
  skew: number
  /** the percentile this game watches (the contour ring). */
  watchP: number
  /** L3: the SLO the player must set and judge. null when not applicable. */
  slo: number | null
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Bucket the samples",
    lesson: "A sample value falls in the bucket whose boundaries straddle it.",
    seed: 11,
    sampleCount: 12,
    skew: 0,
    watchP: 95,
    slo: null,
    passRule: "Predict the bucket of ≥80% of the incoming samples.",
  },
  {
    id: "L2",
    title: "Read the percentile",
    lesson: "p95 is the value below which 95% of samples fall — read it off the terrain contour.",
    seed: 22,
    sampleCount: 1000,
    skew: 0.6,
    watchP: 95,
    slo: null,
    passRule: "Predict which bucket the p95 contour sits in.",
  },
  {
    id: "L3",
    title: "Set the SLO",
    lesson: "The alert fires iff the watched percentile crosses the SLO plane: p95 > SLO.",
    seed: 33,
    sampleCount: 1000,
    skew: 0.5,
    watchP: 95,
    slo: 0.75,
    passRule: "Set the SLO plane and predict correctly whether the alert fires.",
  },
  {
    id: "L4",
    title: "Distribution matters",
    lesson:
      "Two streams can share a mean yet differ on the tail. Percentiles catch what averages hide.",
    seed: 44,
    sampleCount: 1000,
    skew: 0,
    watchP: 95,
    slo: 0.7,
    passRule: "Two distributions, same mean. Predict which one alerts under the SLO.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

/** The seeded sample stream for a level (L1 predicts these one-by-one; L2/L3 pre-fill them). */
export function samplesFor(cfg: LevelConfig): number[] {
  return sampleStream(mulberry32(cfg.seed), cfg.sampleCount, cfg.skew)
}

/** Build a fresh histogram pre-filled with a level's sample stream (L2/L3). */
export function filledHistogram(cfg: LevelConfig): Histogram {
  const h = makeHistogram(N_BUCKETS)
  recordAll(h, samplesFor(cfg))
  return h
}

/**
 * L4 contrast: two distributions with the SAME mean but DIFFERENT p95.
 *  - "tight" — values clustered around 0.5 (low variance); p95 stays low.
 *  - "fat"   — bimodal at the extremes (high variance); p95 chases the top.
 * Under an SLO on p95 the fat one fires and the tight one stays silent — the lesson that
 * averages hide what percentiles reveal. Deterministic given `count`.
 */
export interface DistributionPair {
  id: string
  label: string
  histogram: Histogram
}

export function contrastDistributions(count: number): DistributionPair[] {
  const tight = makeHistogram(N_BUCKETS)
  const fat = makeHistogram(N_BUCKETS)
  const tightVals: number[] = []
  const fatVals: number[] = []
  for (let i = 0; i < count; i++) {
    // tight: 0.4 + (i/count)*0.2 → spans [0.4, 0.6), mean ≈ 0.5, p95 ≈ 0.59
    tightVals.push(0.4 + (i / count) * 0.2)
    // fat: even → 0.05, odd → 0.95 → mean ≈ 0.5, p95 ≈ 0.95
    fatVals.push(i % 2 === 0 ? 0.05 : 0.95)
  }
  recordAll(tight, tightVals)
  recordAll(fat, fatVals)
  return [
    { id: "tight", label: "Tight", histogram: tight },
    { id: "fat", label: "Fat tail", histogram: fat },
  ]
}

export interface LevelOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

/** L1: active-recall on bucketing. Pass at ≥80% accuracy. */
export function evaluateBucketPrediction(correct: number, total: number): LevelOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      bucket_predictions: total,
      bucket_prediction_accuracy: round3(accuracy),
    },
  }
}

/** L2: did the player predict the bucket the watched percentile falls into? */
export function evaluatePercentileBucket(args: {
  predictedBucket: number
  histogram: Histogram
  watchP: number
}): LevelOutcome {
  const pValue = percentile(args.histogram, args.watchP)
  const actual = pValueBucket(args.histogram, pValue)
  const ok = args.predictedBucket === actual
  return {
    pass: ok,
    metrics: {
      percentile_bucket_prediction_ok: ok,
      predicted_bucket: args.predictedBucket,
      actual_bucket: actual,
      watched_percentile: args.watchP,
      percentile_value: round3(pValue),
    },
  }
}

/**
 * L3: set the SLO and predict whether the alert fires. Pass iff the player set the SLO close to
 * the target AND the fires/silent prediction matches the truth (`percentile(p) > slo`).
 */
export function evaluateAlertPrediction(args: {
  setSlo: number
  targetSlo: number
  predictedFiring: boolean
  histogram: Histogram
  watchP: number
}): LevelOutcome {
  const observedP = percentile(args.histogram, args.watchP)
  const actualFiring = observedP > args.setSlo
  const sloSetOk = Math.abs(args.setSlo - args.targetSlo) <= 0.03
  const predictionOk = args.predictedFiring === actualFiring
  return {
    pass: sloSetOk && predictionOk,
    metrics: {
      alert_prediction_ok: predictionOk,
      slo_set: round3(args.setSlo),
      slo_target: args.targetSlo,
      slo_set_ok: sloSetOk,
      observed_percentile: round3(observedP),
      alert_actually_firing: actualFiring,
      predicted_firing: args.predictedFiring,
      watched_percentile: args.watchP,
    },
  }
}

/**
 * L4: pick which of the two contrast distributions alerts under the SLO. Pass iff the chosen
 * distribution is the one whose watched percentile exceeds the SLO, AND the player also names the
 * other one as silent (the contrast must be stated). Reports both means to make the lesson
 * explicit in the evidence: same mean, different tail.
 */
export function evaluateDistributionChoice(args: {
  chosenId: string
  distributions: DistributionPair[]
  slo: number
  watchP: number
}): LevelOutcome {
  const states = args.distributions.map((d) => ({
    id: d.id,
    label: d.label,
    mean: mean(d.histogram),
    pValue: percentile(d.histogram, args.watchP),
    firing: percentile(d.histogram, args.watchP) > args.slo,
  }))
  const alerting = states.find((s) => s.firing) ?? null
  const chosen = states.find((s) => s.id === args.chosenId) ?? null
  const ok = chosen !== null && alerting !== null && chosen.id === alerting.id
  const metrics: Record<string, number | boolean | string> = {
    distribution_choice_ok: ok,
    chosen: args.chosenId,
    alerting: alerting?.id ?? "none",
    slo: args.slo,
    watched_percentile: args.watchP,
  }
  for (const s of states) {
    metrics[`mean_${s.id}`] = round3(s.mean)
    metrics[`p${args.watchP}_${s.id}`] = round3(s.pValue)
    metrics[`firing_${s.id}`] = s.firing
  }
  return { pass: ok, metrics }
}

/** Which finite bucket a percentile value falls into (clamped to the last finite bucket). */
export function pValueBucket(h: Histogram, pValue: number): number {
  if (Number.isNaN(pValue)) return 0
  let idx = 0
  for (let i = 0; i < h.boundaries.length; i++) {
    if (pValue <= (h.boundaries[i] as number)) {
      idx = i
      break
    }
    idx = h.boundaries.length - 1
  }
  return idx
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
