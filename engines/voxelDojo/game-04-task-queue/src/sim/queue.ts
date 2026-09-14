// Bounded worker-pool dispatch core — TASK FORGE (plan: engines/pixelDojo/docs/plans/04_concurrent_task_queue.md §10).
// Pure, headless, deterministic: injected RNG (mulberry32) + logical clock. NO three import.
//
// Invariants (Vitest-enforced):
//   I1 running_count <= worker_count on every step (RF-005)
//   I2 pickNext = priority desc, FIFO tie-break, scheduled_for gate (RF-007/RF-008)
//   I3 transient retry: next_attempt_at = base * 2^retries + jitter(rng), monotonic (RF-009)
//   I4 poison bypasses retry -> DLQ; retries >= max_retries -> DLQ (RF-010)
//   I5 duplicate active idempotency_key rejected (RF-003)
//   I6 backpressure "full" rejects at capacity (RNF-003, RF-013)

export type IngotKind = "clear" | "cracked" | "poison"
export type TaskStatus = "queued" | "running" | "retry_wait" | "succeeded" | "dead"
export type BackpressureState = "open" | "limited" | "full"

export interface SimTask {
  readonly id: string
  readonly idempotencyKey: string
  /** higher = brighter = dispatched first */
  readonly priority: number
  /** arrival time; FIFO tie-break inside a priority band (older first) */
  readonly enqueuedAt: number
  /** countdown ring: not grabbable before this logical instant (RF-008) */
  readonly scheduledFor: number
  readonly kind: IngotKind
  readonly maxRetries: number
  /** remaining guaranteed transient failures (0 = next completion succeeds) */
  failuresLeft: number
  status: TaskStatus
  workerId: string | null
  startedAt: number | null
  retries: number
  nextAttemptAt: number | null
}

export interface ForgeWorker {
  readonly id: string
  busyWith: string | null
}

export interface QueueState {
  now: number
  capacity: number
  workers: ForgeWorker[]
  paused: boolean
  tasks: SimTask[]
  /** RF-005 acceptance: highest running_count ever observed (must stay <= worker_count) */
  maxConcurrentRunning: number
  queueOverflowed: boolean
}

export interface ArrivalSpec {
  readonly at: number
  readonly label: string
  readonly priority: number
  readonly kind: IngotKind
  readonly idempotencyKey: string
  /** absolute logical instant the ingot becomes grabbable (default: at) */
  readonly scheduledFor?: number
  /** remaining transient failures before this cracked ingot cools (default: 1) */
  readonly failuresLeft?: number
}

export function makeWorkers(count: number): ForgeWorker[] {
  return Array.from({ length: count }, (_, i) => ({ id: `arm-${i}`, busyWith: null }))
}

export function makeTask(spec: ArrivalSpec, id: string, maxRetries: number): SimTask {
  return {
    id,
    idempotencyKey: spec.idempotencyKey,
    priority: spec.priority,
    enqueuedAt: spec.at,
    scheduledFor: spec.scheduledFor ?? spec.at,
    kind: spec.kind,
    maxRetries,
    failuresLeft: spec.failuresLeft ?? (spec.kind === "cracked" ? 1 : 0),
    status: "queued",
    workerId: null,
    startedAt: null,
    retries: 0,
    nextAttemptAt: null,
  }
}

export function queueDepth(state: QueueState): number {
  let depth = 0
  for (const t of state.tasks) {
    if (t.status === "queued" || t.status === "retry_wait") depth++
  }
  return depth
}

export function runningCount(workers: readonly ForgeWorker[]): number {
  let n = 0
  for (const w of workers) {
    if (w.busyWith !== null) n++
  }
  return n
}

export function idleWorker(workers: readonly ForgeWorker[]): ForgeWorker | null {
  for (const w of workers) {
    if (w.busyWith === null) return w
  }
  return null
}

/** I5: is this idempotency key held by an ACTIVE task (queued/running/retry_wait)? */
export function hasActiveKey(state: QueueState, idempotencyKey: string): boolean {
  for (const t of state.tasks) {
    if (
      t.idempotencyKey === idempotencyKey &&
      (t.status === "queued" || t.status === "running" || t.status === "retry_wait")
    ) {
      return true
    }
  }
  return false
}

/** I6: depth >= capacity -> "full" (429); >= 80% -> "limited"; else "open". */
export function backpressure(depth: number, capacity: number): BackpressureState {
  if (depth >= capacity) return "full"
  if (depth >= capacity * 0.8) return "limited"
  return "open"
}

export function isEligible(task: SimTask, now: number): boolean {
  if (task.status === "queued") return task.scheduledFor <= now
  if (task.status === "retry_wait") return task.nextAttemptAt !== null && task.nextAttemptAt <= now
  return false
}

/** I2: the next task an idle arm grabs — brightest (priority desc), oldest wins ties. */
export function pickNext(tasks: readonly SimTask[], now: number): SimTask | null {
  let best: SimTask | null = null
  for (const t of tasks) {
    if (!isEligible(t, now)) continue
    if (
      best === null ||
      t.priority > best.priority ||
      (t.priority === best.priority && t.enqueuedAt < best.enqueuedAt) ||
      (t.priority === best.priority && t.enqueuedAt === best.enqueuedAt && t.id < best.id)
    ) {
      best = t
    }
  }
  return best
}

/** Candidate list for the dispatch prediction prompt, in grab order. */
export function dispatchOrder(tasks: readonly SimTask[], now: number): SimTask[] {
  return tasks
    .filter((t) => isEligible(t, now))
    .sort(
      (a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt || a.id.localeCompare(b.id),
    )
}

/**
 * I3: exponential backoff with deterministic jitter — `base * 2^retries + jitter`.
 * The RNG is injected, so the same seed replays the same wave bit-for-bit.
 */
export function retryDelay(base: number, retries: number, jitter: number): number {
  return base * 2 ** retries + jitter
}

/** I1: an idle arm takes `task`; running_count can never exceed worker_count. */
export function dispatch(state: QueueState, taskId: string, worker: ForgeWorker): void {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`dispatch: unknown task ${taskId}`)
  if (worker.busyWith !== null) throw new Error(`dispatch: worker ${worker.id} is busy`)
  if (!isEligible(task, state.now)) throw new Error(`dispatch: task ${taskId} is not eligible`)
  task.status = "running"
  task.workerId = worker.id
  task.startedAt = state.now
  worker.busyWith = task.id
  const running = runningCount(state.workers)
  if (running > state.maxConcurrentRunning) state.maxConcurrentRunning = running
}

export type FinishOutcome = "succeeded" | "transient_failure" | "poison_failure"

/** What actually happens when an arm opens on this ingot. Pure read of scripted truth. */
export function finishOutcome(task: SimTask): FinishOutcome {
  if (task.kind === "poison") return "poison_failure"
  if (task.failuresLeft > 0) return "transient_failure"
  return "succeeded"
}

/** Ground truth for the classify prompt: only poison or exhausted cracks may be scrapped... and only they MUST be. */
export function requiredRoute(task: SimTask): "retry" | "dlq" {
  if (task.kind === "poison") return "dlq"
  if (task.retries >= task.maxRetries) return "dlq"
  return "retry"
}

export interface FailResult {
  status: "retry_wait" | "dead"
  nextAttemptAt: number | null
}

/**
 * I3 + I4: apply a failure. `poison` and exhausted transients go straight to the
 * scrap chute (DLQ); a transient under the limit cools on the annealing rack for
 * `base * 2^retries + jitter(rng)`.
 */
export function failTask(
  task: SimTask,
  retriesAfterFailure: number,
  backoffBase: number,
  now: number,
  jitter: number,
): FailResult {
  task.retries = retriesAfterFailure
  if (task.kind === "poison" || retriesAfterFailure > task.maxRetries) {
    task.status = "dead"
    task.nextAttemptAt = null
    return { status: "dead", nextAttemptAt: null }
  }
  task.failuresLeft -= 1
  task.status = "retry_wait"
  task.nextAttemptAt = now + retryDelay(backoffBase, retriesAfterFailure, jitter)
  return { status: "retry_wait", nextAttemptAt: task.nextAttemptAt }
}

export function succeedTask(state: QueueState, taskId: string): void {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`succeed: unknown task ${taskId}`)
  task.status = "succeeded"
  freeWorker(state, taskId)
}

export function deadLetterTask(state: QueueState, taskId: string): void {
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) throw new Error(`dlq: unknown task ${taskId}`)
  task.status = "dead"
  freeWorker(state, taskId)
}

export function freeWorker(state: QueueState, taskId: string): void {
  for (const w of state.workers) {
    if (w.busyWith === taskId) w.busyWith = null
  }
}

/** Rack -> hopper: a cooled retry becomes grabbable again (original FIFO slot kept). */
export function promoteReady(state: QueueState): void {
  for (const t of state.tasks) {
    if (t.status === "retry_wait" && t.nextAttemptAt !== null && t.nextAttemptAt <= state.now) {
      t.status = "queued"
    }
  }
}

export function enqueueTask(state: QueueState, task: SimTask): void {
  state.tasks.push(task)
}

export function allTerminal(state: QueueState): boolean {
  let seen = 0
  for (const t of state.tasks) {
    if (t.status !== "succeeded" && t.status !== "dead") return false
    seen++
  }
  return seen > 0
}
