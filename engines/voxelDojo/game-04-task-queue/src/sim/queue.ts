/**
 * TASK FORGE sim core — bounded worker-pool dispatch (project 04_concurrent_task_queue).
 *
 * Pure headless rules with injected RNG + injected clock: NO `three` import, NO DOM.
 * Everything here is unit-tested in Vitest without a GPU (voxelDojo PLAN §10).
 *
 * One concept: N workers pull the next eligible task from a bounded priority queue
 * (priority desc, FIFO tie-break); transient failures retry with exponential backoff;
 * poison / exhausted tasks go to the dead-letter queue; the queue rejects new tasks
 * when full (backpressure); duplicate `idempotency_key` submissions are deduped.
 */

export type FailureKind = "clear" | "transient" | "poison"

export type BackpressureLevel = "open" | "limited" | "full"

/** A task = an ingot. `kind` is the hidden outcome the player must route correctly. */
export interface Task {
  readonly id: string
  readonly idempotencyKey: string
  /** higher = brighter glow = dispatched first (RF-007) */
  readonly priority: number
  /** sim-time beat of arrival; FIFO tie-break within a priority band (RF-007) */
  readonly enqueuedAt: number
  /** sim-time beat before which the task is NOT grabbable; 0 = immediately (RF-008) */
  readonly scheduledFor: number
  /** outcome once a forge arm finishes it */
  readonly kind: FailureKind
  readonly retries: number
  readonly maxRetries: number
}

export interface WorkerSlot {
  readonly taskId: string | null
}

export interface WorkerPool {
  readonly workerCount: number
  readonly slots: readonly WorkerSlot[]
}

export function makePool(workerCount: number): WorkerPool {
  return {
    workerCount,
    slots: Array.from({ length: workerCount }, () => ({ taskId: null })),
  }
}

export function runningCount(pool: WorkerPool): number {
  // Optimization: avoid array allocation from .filter().length
  let count = 0
  for (let i = 0; i < pool.slots.length; i++) {
    const s = pool.slots[i]
    if (s && s.taskId !== null) count++
  }
  return count
}

/** Is the task grabbable right now? scheduled_for gates eligibility (RF-008). */
export function isEligible(task: Task, now: number): boolean {
  return now >= task.scheduledFor
}

/**
 * The next task an idle arm grabs: highest priority, ties broken by earliest
 * arrival (FIFO), final tie by id so the pick is a total order (determinism:
 * same queue + same clock ⇒ same pick). Tasks whose scheduled_for countdown
 * ring has not drained are skipped.
 */
export function pickNext(queue: readonly Task[], now: number): Task | null {
  let best: Task | null = null
  for (const task of queue) {
    if (!isEligible(task, now)) continue
    if (best === null) {
      best = task
      continue
    }
    if (task.priority > best.priority) {
      best = task
      continue
    }
    if (task.priority === best.priority && task.enqueuedAt < best.enqueuedAt) {
      best = task
      continue
    }
    if (
      task.priority === best.priority &&
      task.enqueuedAt === best.enqueuedAt &&
      task.id < best.id
    ) {
      best = task
    }
  }
  return best
}

/**
 * Dispatch a task onto the pool. Enforces the RF-005 invariant: `running ≤
 * worker_count` — dispatch is refused (ok: false) when every arm is busy or
 * the task is not yet eligible. The caller (controller) only ever dispatches
 * the `pickNext` truth, so a refusal is a sim regression, not player error.
 */
export function dispatch(
  pool: WorkerPool,
  task: Task,
  now: number,
): { ok: boolean; pool: WorkerPool } {
  if (!isEligible(task, now) || runningCount(pool) >= pool.workerCount) {
    return { ok: false, pool }
  }
  const index = pool.slots.findIndex((slot) => slot.taskId === null)
  if (index === -1) return { ok: false, pool }
  const slots = pool.slots.map((slot, i) => (i === index ? { taskId: task.id } : { ...slot }))
  return { ok: true, pool: { ...pool, slots } }
}

/** Default exponential-backoff base (in beats) shared by every level. */
export const BACKOFF_BASE = 2

export interface FailPlan {
  action: "retry" | "dlq"
  /** retry: sim-time beat at which the task re-enters the hopper as eligible */
  nextAttemptAt: number
  retries: number
}

/**
 * Outcome routing for a finished task (RF-009 / RF-010):
 * - `poison` MUST bypass retries (straight to the DLQ — the canonical queue pathology);
 * - a transient crack under `maxRetries` retries with `backoff = base * 2^retries + jitter(rng)`;
 * - an exhausted transient (retries + 1 > maxRetries) goes to the DLQ too.
 */
export function fail(task: Task, rng: () => number, now: number, base = BACKOFF_BASE): FailPlan {
  if (task.kind === "poison") return { action: "dlq", nextAttemptAt: now, retries: task.retries }
  const retries = task.retries + 1
  if (retries > task.maxRetries) return { action: "dlq", nextAttemptAt: now, retries }
  const jitter = Math.floor(rng() * 2) // 0|1 beat, deterministic per seed
  return { action: "retry", nextAttemptAt: now + base * 2 ** (retries - 1) + jitter, retries }
}

/** A task with an active idempotency_key still in flight is a duplicate (RF-003). */
export function isDuplicate(activeKeys: ReadonlySet<string>, task: Task): boolean {
  return activeKeys.has(task.idempotencyKey)
}

/**
 * Hopper admission level (RNF-003 / RF-013). `full` means the NEXT forklift
 * must be rejected (429) or the hopper overflows.
 */
export function backpressure(queueLength: number, capacity: number): BackpressureLevel {
  if (queueLength >= capacity) return "full"
  if (queueLength >= Math.ceil(capacity * 0.75)) return "limited"
  return "open"
}
