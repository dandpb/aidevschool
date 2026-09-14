import type { BackpressureLevel, FailureKind, Task } from "./queue"

export type LevelId = "L1" | "L2" | "L3" | "L4"

/** One scripted inbound forklift. Fully deterministic — the wave is data, not RNG. */
export interface Arrival {
  readonly id: string
  readonly idempotencyKey: string
  readonly priority: number
  /** beat at which the forklift reaches the dock */
  readonly arrivesAt: number
  /** extra beats before the ingot is grabbable (scheduled_for offset) */
  readonly delayBeats: number
  readonly kind: FailureKind
  readonly retries: number
  readonly maxRetries: number
}

export interface LevelConfig {
  readonly id: LevelId
  readonly title: string
  readonly lesson: string
  readonly passRule: string
  /** seed for the (only) stochastic element: backoff jitter. Same seed ⇒ same wave. */
  readonly seed: number
  readonly workerCount: number
  /** hopper slot count — the bounded queue capacity (backpressure boundary) */
  readonly capacity: number
  readonly arrivals: readonly Arrival[]
}

/**
 * Dispatch/completion cadence (in beats). Every player action advances the
 * clock one beat; completions take WORK_BEATS, a forklift holds the dock for
 * DOCK_WINDOW beats before it lands on its own.
 */
export const WORK_BEATS = 3
export const DOCK_WINDOW = 2

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Prioridade e FIFO",
    lesson:
      "O braço livre pega sempre o lingote mais brilhante (prioridade); empate vai ao mais antigo. P pausa os braços — a fila aceita mesmo assim (200, não erro).",
    passRule: "Acerte ≥80% das previsões de despacho.",
    seed: 4104,
    workerCount: 2,
    capacity: 6,
    arrivals: [
      a("t1", 1, 0, 0, "clear"),
      a("t2", 3, 1, 0, "clear"),
      a("t3", 2, 2, 0, "clear"),
      a("t4", 3, 4, 0, "clear"),
      a("t5", 1, 5, 0, "clear"),
      a("t6", 4, 6, 3, "clear"), // scheduled: countdown ring must drain
      a("t7", 2, 8, 0, "clear"),
      a("t8", 3, 9, 0, "clear"),
      a("t9", 5, 11, 2, "clear"), // high priority, scheduled
      a("t10", 1, 13, 0, "clear"),
    ],
  },
  {
    id: "L2",
    title: "Backpressão e idempotência",
    lesson:
      "O funil tem slots fixos: cheio, o próximo empilhadeira volta com R (429). Sigilo duplicado em voo também volta com R — entrar duplica a tarefa.",
    passRule: "≥80% de acerto em despacho, zero estouros do funil, zero duplicatas enfileiradas.",
    seed: 4204,
    workerCount: 2,
    capacity: 4,
    arrivals: [
      // burst + two SCHEDULED ingots (u6, u8) that park in the hopper: their
      // sigils are provably still active when the duplicate forklifts dock.
      a("u1", 2, 0, 0, "clear"),
      a("u2", 2, 1, 0, "clear"),
      a("u3", 1, 2, 0, "clear"),
      a("u4", 3, 3, 0, "clear"),
      a("u5", 2, 4, 0, "clear"),
      a("u6", 1, 5, 6, "clear"), // scheduled: parked in hopper until ~beat 16
      a("u7", 2, 6, 0, "clear"),
      a("u8", 3, 7, 6, "clear"), // scheduled: parked in hopper until ~beat 20
      a("u9", 1, 8, 0, "clear"),
      a("u10", 2, 10, 0, "clear", "sigil-u6"), // duplicate of parked u6 → R
      a("u11", 3, 12, 0, "clear", "sigil-u8"), // duplicate of parked u8 → R
      a("u12", 1, 14, 0, "clear"),
      a("u13", 2, 15, 0, "clear"),
      a("u14", 1, 16, 0, "clear"),
    ],
  },
  {
    id: "L3",
    title: "Retry e backoff",
    lesson:
      "Lingote rachado (falha transitória) descansa no rack de têmpera por base·2^retries + jitter antes de voltar ao funil — agende o re-despacho no tempo certo.",
    passRule: "≥80% em despacho e 100% de acerto nas classificações retry.",
    seed: 4304,
    workerCount: 2,
    capacity: 6,
    arrivals: [
      a("v1", 2, 0, 0, "clear"),
      a("v2", 1, 1, 0, "transient", undefined, 0, 2),
      a("v3", 3, 3, 0, "clear"),
      a("v4", 2, 4, 0, "transient", undefined, 0, 2),
      a("v5", 1, 6, 0, "clear"),
      a("v6", 3, 8, 0, "transient", undefined, 1, 2), // at budget edge after one retry
      a("v7", 2, 10, 0, "clear"),
      a("v8", 1, 12, 0, "transient", undefined, 0, 2),
      a("v9", 3, 14, 0, "clear"),
    ],
  },
  {
    id: "L4",
    title: "Poison e DLQ — o gauntlet",
    lesson:
      "Lingote com trinca vermelha (poison) NUNCA vai ao rack: direto para a calha de sucata (DLQ). Rachadura no limite de retries também vira sucata.",
    passRule:
      "Todas as condições do contrato: despacho ≥80%, retry/DLQ 100%, zero poison re-enfileirado, zero estouros, zero duplicatas.",
    seed: 4404,
    workerCount: 3,
    capacity: 5,
    arrivals: [
      a("w1", 2, 0, 0, "clear"),
      a("w2", 3, 1, 0, "poison"),
      a("w3", 1, 2, 0, "clear"),
      a("w4", 2, 3, 0, "transient", undefined, 2, 2), // exhausted → DLQ
      a("w5", 3, 4, 0, "clear"),
      a("w6", 1, 5, 0, "clear"),
      a("w7", 2, 6, 0, "poison"),
      a("w8", 3, 8, 2, "clear"), // scheduled high priority
      a("w9", 1, 9, 0, "transient", undefined, 0, 2),
      a("w10", 2, 10, 0, "clear", "sigil-w9"), // duplicate of in-flight w9 → R
      a("w11", 3, 12, 0, "clear"),
      a("w12", 2, 14, 0, "transient", undefined, 1, 2),
    ],
  },
] as const

function a(
  id: string,
  priority: number,
  arrivesAt: number,
  delayBeats: number,
  kind: FailureKind,
  idempotencyKey?: string,
  retries = 0,
  maxRetries = 2,
): Arrival {
  return {
    id,
    idempotencyKey: idempotencyKey ?? `sigil-${id}`,
    priority,
    arrivesAt,
    delayBeats,
    kind,
    retries,
    maxRetries,
  }
}

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

/** Hopper admission level for the current queue depth (HUD gauge + scene pulse). */
export function hopperLevel(queueLength: number, capacity: number): BackpressureLevel {
  if (queueLength >= capacity) return "full"
  if (queueLength >= capacity - 1) return "limited"
  return "open"
}

// ── evidence metrics (frozen contract, plan §11) ─────────────────────────────

export interface WaveMetrics {
  readonly kind: "voxeldojo-task-queue"
  readonly dispatch_predictions: number
  readonly dispatch_correct: number
  readonly retry_classifications: number
  readonly retry_correct: number
  readonly dlq_classifications: number
  readonly dlq_correct: number
  readonly poison_requeued: number
  readonly backpressure_violations: number
  readonly idempotency_duplicates_enqueued: number
  readonly queue_overflowed: boolean
  readonly max_concurrent_running: number
  readonly worker_count: number
}

export function emptyMetrics(workerCount: number): WaveMetrics {
  return {
    kind: "voxeldojo-task-queue",
    dispatch_predictions: 0,
    dispatch_correct: 0,
    retry_classifications: 0,
    retry_correct: 0,
    dlq_classifications: 0,
    dlq_correct: 0,
    poison_requeued: 0,
    backpressure_violations: 0,
    idempotency_duplicates_enqueued: 0,
    queue_overflowed: false,
    max_concurrent_running: 0,
    worker_count: workerCount,
  }
}

/**
 * Pass rule (plan §6/§11) — every clause is a direct readout of the queue
 * contract, not twitch skill:
 * - dispatch accuracy ≥ 0.80 (priority + FIFO + scheduled_for held);
 * - retry/DLQ classification perfect on both directions;
 * - no poison requeued (the canonical queue pathology);
 * - backpressure held (no violations, no overflow);
 * - idempotency held (no duplicate sigil enqueued);
 * - RF-005 invariant: max concurrent running ≤ worker_count on every tick.
 */
export function evaluateWave(m: WaveMetrics): boolean {
  const dispatchAccuracy =
    m.dispatch_predictions === 0 ? 0 : m.dispatch_correct / m.dispatch_predictions
  return (
    dispatchAccuracy >= 0.8 &&
    m.retry_correct === m.retry_classifications &&
    m.dlq_correct === m.dlq_classifications &&
    m.poison_requeued === 0 &&
    m.backpressure_violations === 0 &&
    m.idempotency_duplicates_enqueued === 0 &&
    m.queue_overflowed === false &&
    m.max_concurrent_running <= m.worker_count
  )
}

/** Convert a scripted arrival into a live hopper Task. */
export function toTask(arrival: Arrival, now: number): Task {
  return {
    id: arrival.id,
    idempotencyKey: arrival.idempotencyKey,
    priority: arrival.priority,
    enqueuedAt: now,
    scheduledFor: now + arrival.delayBeats,
    kind: arrival.kind,
    retries: arrival.retries,
    maxRetries: arrival.maxRetries,
  }
}
