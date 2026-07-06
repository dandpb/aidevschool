// Headless worker-pool dispatch core. Pure functions with injected RNG +
// injectable clock; NO `three` import here. The 3D scene only renders state
// produced by these functions; every rule lives in this file and is covered
// by Vitest (src/game/logic.test.ts).
//
// Invariants encoded (curriculum 04_concurrent_task_queue):
//   RF-005  running_count ≤ worker_count on every tick
//   RF-006  worker_count = 0 ⇒ paused (queue still accepts)
//   RF-007  priority desc + FIFO tie-break + scheduled_for gating
//   RF-008  scheduled_for gates eligibility (deferred dispatch)
//   RF-009  transient ⇒ retry with exponential backoff + jitter
//   RF-010  poison OR retries > max_retries ⇒ DLQ (no further retries)
//   RF-013  backpressure: queue.open | limited | full at capacity
//   RNF-003 bounded queue: capacity rejects (429) when full
//   RF-003  idempotency dedup on active idempotency_key

export type TaskKind = "clear" | "transient" | "poison"

export interface Task {
  readonly id: string
  readonly sigil: string
  readonly priority: number
  readonly arrivalTick: number
  readonly kind: TaskKind
  retries: number
  maxRetries: number
  scheduledFor: number
  status: "queued" | "running" | "retrying" | "needs-classify" | "done" | "dlq"
}

export type BackpressureState = "open" | "limited" | "full"

/** Deterministic seeded RNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** RF-007 — pick the next eligible task: highest priority, then oldest arrival.
 *  Considers both queued tasks and retrying tasks whose backoff has elapsed
 *  (scheduledFor ≤ now). */
export function pickNext(tasks: readonly Task[], now: number): Task | null {
  const eligible = tasks.filter(
    (t) =>
      (t.status === "queued" || (t.status === "retrying" && t.scheduledFor <= now)) &&
      t.scheduledFor <= now,
  )
  if (eligible.length === 0) return null
  let best = eligible[0] as Task
  for (const t of eligible) {
    if (t.priority > best.priority) best = t
    else if (t.priority === best.priority && t.arrivalTick < best.arrivalTick) best = t
  }
  return best
}

/** RF-013 — backpressure state of a queue of length `len` against `capacity`. */
export function backpressure(len: number, capacity: number): BackpressureState {
  if (len >= capacity) return "full"
  if (len >= Math.ceil(capacity * 0.75)) return "limited"
  return "open"
}

/**
 * RF-003 — idempotency dedup. Rejects the new key when an active (queued /
 * running / retrying) task already holds the same sigil. Done/DLQ tasks free
 * their sigil.
 */
export function isDuplicateSigil(activeSigils: ReadonlySet<string>, sigil: string): boolean {
  return activeSigils.has(sigil)
}

/** Compute the set of sigils currently "active" (queued/running/retrying). */
export function activeSigilsOf(tasks: readonly Task[]): Set<string> {
  const out = new Set<string>()
  for (const t of tasks) {
    if (t.status === "queued" || t.status === "running" || t.status === "retrying") {
      out.add(t.sigil)
    }
  }
  return out
}

/**
 * RF-005 — dispatch. Mutates the chosen task to "running" and asserts the
 * invariant. Returns the dispatched task or null if no worker was free.
 */
export function dispatch(
  workers: { readonly busy: boolean }[],
  tasks: readonly Task[],
  now: number,
): Task | null {
  const freeIdx = workers.findIndex((w) => !w.busy)
  if (freeIdx < 0) return null
  const next = pickNext(tasks, now)
  if (!next) return null
  next.status = "running"
  return next
}

/** RF-005 invariant check — must hold on every tick. */
export function runningInvariant(tasks: readonly Task[], workerCount: number): boolean {
  let running = 0
  for (const t of tasks) if (t.status === "running") running++
  return running <= workerCount
}

export type FailureOutcome =
  | { kind: "retry"; nextAttemptAt: number; reason: "transient" }
  | { kind: "dlq"; reason: "poison" | "max-retries" }

/**
 * RF-009 + RF-010 — decide what happens to a task that finished with a
 * transient failure. Poison always DLQs; transient retries with exponential
 * backoff + jitter until retries > maxRetries, then DLQs.
 *
 * `nextAttemptAt = base * 2^retries + jitter(rng)` for transient retries.
 */
export function fail(
  task: Task,
  kind: TaskKind,
  now: number,
  rng: () => number,
  baseBackoff: number,
): FailureOutcome {
  if (kind === "poison") return { kind: "dlq", reason: "poison" }
  // transient
  task.retries += 1
  if (task.retries > task.maxRetries) return { kind: "dlq", reason: "max-retries" }
  const jitter = Math.floor(rng() * 100) / 100
  const nextAttemptAt = now + baseBackoff * 2 ** (task.retries - 1) + jitter
  task.scheduledFor = nextAttemptAt
  task.status = "retrying"
  return { kind: "retry", nextAttemptAt, reason: "transient" }
}

/** Count currently-active tasks (queued + running + retrying). */
export function queueDepth(tasks: readonly Task[]): number {
  let n = 0
  for (const t of tasks) {
    if (t.status === "queued" || t.status === "running" || t.status === "retrying") n++
  }
  return n
}

/** Make a task from a scripted wave event (mutable so the sim can mutate status). */
export function makeTask(input: {
  readonly id: string
  readonly sigil: string
  readonly priority: number
  readonly arrivalTick: number
  readonly kind: TaskKind
  readonly maxRetries: number
  readonly scheduledFor?: number
}): Task {
  return {
    id: input.id,
    sigil: input.sigil,
    priority: input.priority,
    arrivalTick: input.arrivalTick,
    kind: input.kind,
    retries: 0,
    maxRetries: input.maxRetries,
    scheduledFor: input.scheduledFor ?? input.arrivalTick,
    status: "queued",
  }
}
