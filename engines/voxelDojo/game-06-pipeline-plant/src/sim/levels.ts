import {
  type BackpressuredResult,
  bufferedOverflows,
  bufferedUpload,
  bufferedUploadBackpressured,
  streamingUpload,
  type UploadResult,
} from "./pipeline"
import { intInRange, mulberry32 } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

/** A scripted upload job: deterministic parameters for one wave. */
export interface UploadJob {
  size: number
  capacity: number
  /** stream mode only; ignored in buffered levels */
  chunkSize: number
  /** L4 only: drain rate (bytes/ms) and the time window (ms) the drain runs for */
  drainRate: number
  timeMs: number
}

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  seed: number
  /** builds the deterministic upload job for this level from the seed */
  job: UploadJob
  /** the upload mode this level teaches with */
  mode: "buffered" | "streaming"
  /** L3: unlock the chunk-size dial */
  chunkUnlocked: boolean
  /** L4: backpressure enabled */
  backpressure: boolean
  passRule: string
}

/**
 * Generate a deterministic upload job from a seed. `sizeBand` picks the file size relative to
 * capacity; `overRisk` biases the buffered size over capacity so overflows actually happen.
 */
function makeJob(
  seed: number,
  capacity: number,
  chunkSize: number,
  opts: { sizeBand: [number, number]; drainRate?: number; timeMs?: number },
): UploadJob {
  const rng = mulberry32(seed)
  const [lo, hi] = opts.sizeBand
  const size = intInRange(rng, Math.round(capacity * lo), Math.round(capacity * hi))
  return {
    size,
    capacity,
    chunkSize,
    drainRate: opts.drainRate ?? 0,
    timeMs: opts.timeMs ?? 0,
  }
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Buffer tank",
    lesson:
      "A buffered upload loads the whole file at once — peakMem = size, so it overflows iff size > capacity.",
    seed: 61,
    job: makeJob(61, 100, 0, { sizeBand: [0.6, 1.6] }),
    mode: "buffered",
    chunkUnlocked: false,
    backpressure: false,
    passRule: "Predict whether the buffered upload overflows the tank.",
  },
  {
    id: "L2",
    title: "Stream mode",
    lesson:
      "Streaming pumps fixed chunks — peakMem = chunkSize, flat regardless of total size. It never overflows while the chunk fits.",
    seed: 62,
    // big file (5x–12x capacity) that WOULD overflow buffered; the lesson is streaming stays bounded
    job: makeJob(62, 100, 40, { sizeBand: [5, 12] }),
    mode: "streaming",
    chunkUnlocked: false,
    backpressure: false,
    passRule: "Predict that streaming keeps peak memory bounded — no overflow.",
  },
  {
    id: "L3",
    title: "Tune the chunk",
    lesson:
      "Peak memory in stream mode IS the chunk size. Dial it to fit the capacity; too big and even one chunk spills.",
    seed: 63,
    job: makeJob(63, 100, 40, { sizeBand: [4, 8] }),
    mode: "streaming",
    chunkUnlocked: true,
    backpressure: false,
    passRule: "Set a chunk size that fits the capacity and predict the resulting peak.",
  },
  {
    id: "L4",
    title: "Backpressure",
    lesson:
      "A slow drain stalls a buffered upload (backlog, no loss) or overflows it (tank full, data lost). Streaming stays bounded either way.",
    seed: 64,
    // size well above capacity + drainRate; the buffered path overflows, streaming does not
    job: makeJob(64, 100, 40, { sizeBand: [8, 14], drainRate: 0.1, timeMs: 1000 }),
    mode: "buffered",
    chunkUnlocked: false,
    backpressure: true,
    passRule: "Predict whether the buffered upload stalls or overflows under backpressure.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

/** The ground-truth result for a buffered (or backpressured buffered) job. */
export function bufferedTruth(
  job: UploadJob,
  backpressure: boolean,
): UploadResult | BackpressuredResult {
  if (backpressure) {
    return bufferedUploadBackpressured(job.size, job.capacity, job.drainRate, job.timeMs)
  }
  return bufferedUpload(job.size, job.capacity)
}

/** The ground-truth result for a streaming job (with a possibly player-tuned chunkSize). */
export function streamingTruth(job: UploadJob, chunkSize: number): UploadResult {
  return streamingUpload(job.size, chunkSize, job.capacity)
}

/**
 * L1/L4: did the player's overflow prediction match the buffered sim truth?
 * `predictedOverflow` = the player's yes/no call. Under backpressure we additionally report the
 * stall vs overflow distinction but pass on a correct overflow call.
 */
export function evaluateOverflowPrediction(args: {
  job: UploadJob
  backpressure: boolean
  predictedOverflow: boolean
}): WaveOutcome {
  const truth = bufferedTruth(args.job, args.backpressure)
  const actualOverflow = truth.overflowed > 0
  const pass = args.predictedOverflow === actualOverflow
  const metrics: Record<string, number | boolean | string> = {
    size: args.job.size,
    capacity: args.job.capacity,
    mode: "buffered",
    overflow_predicted: args.predictedOverflow,
    overflow_actual: actualOverflow,
    peak_mem: truth.peakMem,
    delivered: truth.delivered,
    overflowed: truth.overflowed,
  }
  if (args.backpressure && "stalled" in truth) {
    metrics.stalled = truth.stalled
    metrics.drained = truth.drained
    metrics.drain_rate = args.job.drainRate
    metrics.time_ms = args.job.timeMs
  }
  return { pass, metrics }
}

/**
 * L2: predict that streaming stays bounded (no overflow). The lesson is the flat peak — the player
 * must call "no overflow" and the truth confirms peakMem = chunkSize regardless of the huge size.
 */
export function evaluateBoundedMemory(args: {
  job: UploadJob
  predictedBounded: boolean
}): WaveOutcome {
  const truth = streamingTruth(args.job, args.job.chunkSize)
  const actualBounded = truth.overflowed === 0
  const pass = args.predictedBounded === actualBounded && actualBounded
  return {
    pass,
    metrics: {
      size: args.job.size,
      capacity: args.job.capacity,
      chunk_size: args.job.chunkSize,
      mode: "streaming",
      bounded_predicted: args.predictedBounded,
      bounded_actual: actualBounded,
      peak_mem: truth.peakMem,
      delivered: truth.delivered,
      overflowed: truth.overflowed,
    },
  }
}

/**
 * L3: player tunes the chunk size and predicts the peak memory (= chunkSize). Pass requires the
 * chunk to fit (no overflow) AND the predicted peak within tolerance of the actual chunkSize.
 */
export function evaluateChunkTune(args: {
  job: UploadJob
  chunkSize: number
  predictedPeak: number
}): WaveOutcome {
  const truth = streamingTruth(args.job, args.chunkSize)
  const fits = truth.overflowed === 0
  const peakAccurate = Math.abs(args.predictedPeak - truth.peakMem) <= 1
  const pass = fits && peakAccurate
  return {
    pass,
    metrics: {
      size: args.job.size,
      capacity: args.job.capacity,
      chunk_size: args.chunkSize,
      mode: "streaming",
      peak_predicted: args.predictedPeak,
      peak_actual: truth.peakMem,
      delivered: truth.delivered,
      overflowed: truth.overflowed,
      chunk_fits: fits,
    },
  }
}

/** True iff a buffered upload of `job` overflows (ground truth, for the HUD hint + smoke test). */
export function bufferedJobOverflows(job: UploadJob, backpressure: boolean): boolean {
  if (backpressure) {
    return (
      bufferedUploadBackpressured(job.size, job.capacity, job.drainRate, job.timeMs).overflowed > 0
    )
  }
  return bufferedOverflows(job.size, job.capacity)
}
