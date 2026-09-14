// TASK FORGE levels — one scripted wave per level (plan §3/§4). Scripts are data-only:
// same seed + same script => same wave, bit-for-bit (determinism invariant).
import type { ArrivalSpec } from "./queue"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  readonly id: LevelId
  readonly title: string
  readonly lesson: string
  readonly seed: number
  readonly capacity: number
  readonly workerCount: number
  /** logical seconds an arm holds an ingot before opening it */
  readonly serviceTime: number
  /** retry backoff base (delay = base * 2^retries + jitter) */
  readonly backoffBase: number
  readonly maxRetries: number
  readonly arrivals: readonly ArrivalSpec[]
  readonly passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "First dispatches",
    lesson:
      "An idle arm always grabs the brightest eligible ingot; ties go to the oldest arrival. P parks every arm — the hopper keeps accepting (paused is not broken).",
    seed: 11,
    capacity: 8,
    workerCount: 3,
    serviceTime: 2,
    backoffBase: 1,
    maxRetries: 2,
    arrivals: [
      { at: 0, label: "order #101", priority: 1, kind: "clear", idempotencyKey: "ik-101" },
      { at: 0.4, label: "order #102", priority: 2, kind: "clear", idempotencyKey: "ik-102" },
      { at: 0.8, label: "email #5", priority: 2, kind: "clear", idempotencyKey: "ik-105" },
      { at: 1.2, label: "render #42", priority: 3, kind: "clear", idempotencyKey: "ik-142" },
      { at: 1.6, label: "webhook #7", priority: 1, kind: "clear", idempotencyKey: "ik-107" },
      { at: 3, label: "digest", priority: 2, kind: "clear", idempotencyKey: "ik-201" },
      { at: 3.4, label: "thumb #200", priority: 2, kind: "clear", idempotencyKey: "ik-200" },
      { at: 3.8, label: "audit", priority: 3, kind: "clear", idempotencyKey: "ik-301" },
      { at: 4.2, label: "order #103", priority: 1, kind: "clear", idempotencyKey: "ik-103" },
      { at: 4.6, label: "fanout #9", priority: 1, kind: "clear", idempotencyKey: "ik-109" },
      { at: 6.5, label: "report", priority: 3, kind: "clear", idempotencyKey: "ik-302" },
      { at: 6.9, label: "order #104", priority: 2, kind: "clear", idempotencyKey: "ik-104" },
    ],
    passRule: "Predict the grabbed ingot on >= 80% of dispatches.",
  },
  {
    id: "L2",
    title: "Scheduled ingots",
    lesson:
      "A countdown ring gates grabbing: scheduled_for beats brightness. The next arm takes the brightest ingot whose ring has already drained.",
    seed: 22,
    capacity: 6,
    workerCount: 2,
    serviceTime: 2,
    backoffBase: 1,
    maxRetries: 2,
    arrivals: [
      { at: 0, label: "warmup", priority: 1, kind: "clear", idempotencyKey: "ik-401" },
      {
        at: 1.5,
        label: "hold #1",
        priority: 3,
        kind: "clear",
        idempotencyKey: "ik-402",
        scheduledFor: 6,
      },
      { at: 3, label: "quick #1", priority: 1, kind: "clear", idempotencyKey: "ik-403" },
      {
        at: 4.5,
        label: "hold #2",
        priority: 3,
        kind: "clear",
        idempotencyKey: "ik-404",
        scheduledFor: 9,
      },
      { at: 6, label: "quick #2", priority: 2, kind: "clear", idempotencyKey: "ik-405" },
      {
        at: 7.5,
        label: "hold #3",
        priority: 2,
        kind: "clear",
        idempotencyKey: "ik-406",
        scheduledFor: 11,
      },
      { at: 9, label: "quick #3", priority: 1, kind: "clear", idempotencyKey: "ik-407" },
      { at: 10.5, label: "bright", priority: 3, kind: "clear", idempotencyKey: "ik-408" },
      { at: 12, label: "quick #4", priority: 2, kind: "clear", idempotencyKey: "ik-409" },
      { at: 13.5, label: "closer", priority: 1, kind: "clear", idempotencyKey: "ik-410" },
    ],
    passRule: "Predict the grabbed ingot on >= 80% of dispatches — respect the countdown rings.",
  },
  {
    id: "L3",
    title: "Cracked & poisoned",
    lesson:
      "A transient crack cools on the annealing rack (backoff = base * 2^retries + jitter) and re-enters the hopper. A poison ingot or a crack at max_retries goes straight to the scrap chute.",
    seed: 33,
    capacity: 8,
    workerCount: 3,
    serviceTime: 2,
    backoffBase: 1,
    maxRetries: 2,
    arrivals: [
      { at: 0, label: "order #201", priority: 2, kind: "clear", idempotencyKey: "ik-501" },
      { at: 1.5, label: "flake #1", priority: 2, kind: "cracked", idempotencyKey: "ik-502" },
      { at: 3, label: "webhook #8", priority: 1, kind: "clear", idempotencyKey: "ik-503" },
      { at: 4.5, label: "poison ocr", priority: 3, kind: "poison", idempotencyKey: "ik-504" },
      { at: 6, label: "digest", priority: 2, kind: "clear", idempotencyKey: "ik-505" },
      {
        at: 7.5,
        label: "brittle csv",
        priority: 1,
        kind: "cracked",
        idempotencyKey: "ik-506",
        failuresLeft: 3,
      },
      { at: 9, label: "flake #2", priority: 3, kind: "cracked", idempotencyKey: "ik-507" },
      { at: 10.5, label: "poison json", priority: 2, kind: "poison", idempotencyKey: "ik-508" },
      { at: 12, label: "render #43", priority: 1, kind: "clear", idempotencyKey: "ik-509" },
      { at: 13.5, label: "flake #3", priority: 2, kind: "cracked", idempotencyKey: "ik-510" },
      { at: 15, label: "audit", priority: 3, kind: "clear", idempotencyKey: "ik-511" },
      { at: 16.5, label: "order #202", priority: 1, kind: "clear", idempotencyKey: "ik-512" },
    ],
    passRule:
      "Classify every finished ingot correctly (retry vs DLQ), predict >= 80% of dispatches, never requeue poison.",
  },
  {
    id: "L4",
    title: "Forge storm",
    lesson:
      "The full contract under pressure: reject (R) when the hopper is full (429 backpressure) and when a duplicate sigil arrives (idempotency). One overflow or one duplicate enqueued breaks the forge.",
    seed: 44,
    capacity: 5,
    workerCount: 3,
    serviceTime: 2,
    backoffBase: 1,
    maxRetries: 2,
    arrivals: [
      { at: 0, label: "order #301", priority: 2, kind: "clear", idempotencyKey: "ik-601" },
      { at: 0.5, label: "order #302", priority: 2, kind: "clear", idempotencyKey: "ik-602" },
      { at: 1, label: "render #50", priority: 3, kind: "clear", idempotencyKey: "ik-603" },
      {
        at: 1.5,
        label: "hold #1",
        priority: 1,
        kind: "clear",
        idempotencyKey: "ik-604",
        scheduledFor: 5.5,
      },
      {
        at: 2,
        label: "hold #2",
        priority: 1,
        kind: "clear",
        idempotencyKey: "ik-605",
        scheduledFor: 6,
      },
      { at: 2.5, label: "digest", priority: 1, kind: "clear", idempotencyKey: "ik-606" },
      { at: 3.2, label: "webhook #10", priority: 2, kind: "clear", idempotencyKey: "ik-607" },
      { at: 3.4, label: "fanout #11", priority: 1, kind: "clear", idempotencyKey: "ik-608" },
      { at: 3.6, label: "flake #9", priority: 1, kind: "cracked", idempotencyKey: "ik-609" },
      { at: 3.7, label: "spike #1", priority: 1, kind: "clear", idempotencyKey: "ik-616" },
      { at: 3.8, label: "audit", priority: 1, kind: "clear", idempotencyKey: "ik-610" },
      { at: 3.9, label: "spike #2", priority: 1, kind: "clear", idempotencyKey: "ik-617" },
      { at: 3.95, label: "storm", priority: 1, kind: "clear", idempotencyKey: "ik-618" },
      { at: 4, label: "digest AGAIN", priority: 2, kind: "clear", idempotencyKey: "ik-606" },
      { at: 5, label: "poison csv", priority: 2, kind: "poison", idempotencyKey: "ik-611" },
      { at: 6.5, label: "flake #10", priority: 3, kind: "cracked", idempotencyKey: "ik-612" },
      { at: 8, label: "report #9", priority: 2, kind: "clear", idempotencyKey: "ik-613" },
      {
        at: 9.5,
        label: "brittle xml",
        priority: 1,
        kind: "cracked",
        idempotencyKey: "ik-614",
        failuresLeft: 3,
      },
      { at: 11, label: "closer", priority: 2, kind: "clear", idempotencyKey: "ik-615" },
    ],
    passRule:
      "Hold the whole contract: >= 80% dispatch predictions, every classification right, zero overflow, zero duplicates in, zero poison requeued.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export interface WaveMetrics {
  [metric: string]: number | boolean | string
  kind: "voxeldojo-task-queue"
  dispatch_predictions: number
  dispatch_correct: number
  retry_classifications: number
  retry_correct: number
  dlq_classifications: number
  dlq_correct: number
  poison_requeued: number
  backpressure_violations: number
  idempotency_duplicates_enqueued: number
  queue_overflowed: boolean
  max_concurrent_running: number
  worker_count: number
}

export interface WaveOutcome {
  pass: boolean
  metrics: WaveMetrics
}

/** Pass rule frozen in the plan §11 — the same rule the independent gate evaluator re-checks. */
export function evaluateQueueWave(m: WaveMetrics): WaveOutcome {
  const dispatchAccuracy =
    m.dispatch_predictions === 0 ? 0 : m.dispatch_correct / m.dispatch_predictions
  const pass =
    dispatchAccuracy >= 0.8 &&
    m.retry_correct === m.retry_classifications &&
    m.dlq_correct === m.dlq_classifications &&
    m.poison_requeued === 0 &&
    m.backpressure_violations === 0 &&
    m.idempotency_duplicates_enqueued === 0 &&
    m.queue_overflowed === false &&
    m.max_concurrent_running <= m.worker_count
  return { pass, metrics: m }
}
