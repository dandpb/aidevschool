// TASK FORGE wave coordinator. Deterministic discrete-event pump: every player
// decision advances the world to the next event instant (injectable logical clock,
// seeded jitter) — same inputs => same progression, headless-testable in Vitest.
import { emitEvidence } from "../evidence/emit"
import {
  evaluateQueueWave,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
} from "../sim/levels"
import {
  type ArrivalSpec,
  allTerminal,
  backpressure,
  deadLetterTask,
  dispatch,
  dispatchOrder,
  failTask,
  hasActiveKey,
  idleWorker,
  makeTask,
  makeWorkers,
  pickNext,
  promoteReady,
  type QueueState,
  queueDepth,
  requiredRoute,
  runningCount,
  type SimTask,
  succeedTask,
} from "../sim/queue"
import { mulberry32 } from "../sim/rng"

export type Phase = "briefing" | "running" | "cleared" | "failed"

/**
 * Closed decision trace consumed by the independent TASK FORGE verifier
 * (learner/gate/task_queue_evaluator.py, pinned in PR-A2): one entry per
 * answered prompt, in prompt order, with exactly the keys the replay accepts.
 * The trace records what the player actually did (wrong predictions included)
 * and is never reordered — a match played with pauses may answer prompts in an
 * order that diverges from the verifier's no-pause replay and is then rejected
 * fail-closed, never accepted by self-declared metrics.
 */
export type TraceDecision =
  | { readonly type: "dispatch"; readonly taskId: string }
  | { readonly type: "classify"; readonly taskId: string; readonly route: "retry" | "dlq" }
  | { readonly type: "gate"; readonly action: "reject" | "admit" }

export type Prompt =
  | { readonly kind: "dispatch"; readonly candidates: readonly SimTask[] }
  | { readonly kind: "classify"; readonly task: SimTask }
  | { readonly kind: "gate"; readonly arrival: ArrivalSpec; readonly reason: "full" | "duplicate" }

export interface GameState {
  readonly level: LevelConfig
  phase: Phase
  queue: QueueState
  arrivalIndex: number
  /** the decision the world is waiting on (null while auto-advancing / paused) */
  pending: Prompt | null
  dispatchPredictions: number
  dispatchCorrect: number
  retryClassifications: number
  retryCorrect: number
  dlqClassifications: number
  dlqCorrect: number
  poisonRequeued: number
  backpressureViolations: number
  duplicatesEnqueued: number
  /** decisions answered this wave, emitted as observations (verifier contract) */
  decisions: TraceDecision[]
  /** diagnostics beyond the frozen metrics (HUD/tests; never emitted) */
  gatesRejected: number
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

export class GameController {
  private state: GameState
  private listeners: Listener[] = []
  private rng: () => number

  constructor(level: LevelId = "L1") {
    this.rng = mulberry32(levelConfig(level).seed ^ 0x5eed04)
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    return {
      level: cfg,
      phase: "briefing",
      queue: {
        now: 0,
        capacity: cfg.capacity,
        workers: makeWorkers(cfg.workerCount),
        paused: false,
        tasks: [],
        maxConcurrentRunning: 0,
        queueOverflowed: false,
      },
      arrivalIndex: 0,
      pending: null,
      dispatchPredictions: 0,
      dispatchCorrect: 0,
      retryClassifications: 0,
      retryCorrect: 0,
      dlqClassifications: 0,
      dlqCorrect: 0,
      poisonRequeued: 0,
      backpressureViolations: 0,
      duplicatesEnqueued: 0,
      decisions: [],
      gatesRejected: 0,
      lastMetrics: null,
    }
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  private commit(): void {
    for (const fn of this.listeners) fn(this.state)
  }

  start(): void {
    if (this.state.phase !== "briefing") return
    this.state.phase = "running"
    this.pump()
    this.commit()
  }

  loadLevel(level: LevelId): void {
    this.rng = mulberry32(levelConfig(level).seed ^ 0x5eed04)
    this.state = this.freshState(levelConfig(level))
    this.commit()
  }

  nextLevel(): void {
    const idx = LEVELS.findIndex((l) => l.id === this.state.level.id)
    const next = LEVELS[idx + 1]
    if (next) this.loadLevel(next.id)
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  /** P — park/resume every arm. Paused arms hold their ingot; the hopper keeps accepting. */
  togglePause(): void {
    if (this.state.phase !== "running") return
    this.state.queue.paused = !this.state.queue.paused
    this.pump()
    this.commit()
  }

  /** Player's prediction for the next grab; the arm then takes the TRUTH (pickNext). */
  predictDispatch(taskId: string): void {
    const pending = this.state.pending
    if (this.state.phase !== "running" || pending?.kind !== "dispatch") return
    const truth = pickNext(this.state.queue.tasks, this.state.queue.now)
    if (!truth) return
    this.state.dispatchPredictions++
    // trace the player's prediction (wrong ids included), not the truth
    this.state.decisions = [...this.state.decisions, { type: "dispatch", taskId }]
    if (taskId === truth.id) this.state.dispatchCorrect++
    const worker = idleWorker(this.state.queue.workers)
    if (!worker) throw new Error("dispatch prompt with no idle worker (invariant I1)")
    dispatch(this.state.queue, truth.id, worker)
    this.state.pending = null
    this.pump()
    this.commit()
  }

  /** Route the held finished ingot to the annealing rack (retry). */
  classifyRetry(taskId: string): void {
    const pending = this.state.pending
    if (this.state.phase !== "running" || pending?.kind !== "classify") return
    if (pending.task.id !== taskId) return
    const task = this.requireTask(taskId)
    this.state.retryClassifications++
    this.state.decisions = [...this.state.decisions, { type: "classify", taskId, route: "retry" }]
    if (requiredRoute(task) === "retry") {
      this.state.retryCorrect++
      this.applyTransientFailure(task)
    } else if (task.kind === "poison") {
      // canonical pathology: poison parked on the rack will only fail again
      this.state.poisonRequeued++
      task.status = "retry_wait"
      task.nextAttemptAt =
        this.state.queue.now + this.state.level.backoffBase * 2 ** task.retries + this.jitter()
    } else {
      // exhausted crack: the forge refuses — retries over the limit go to scrap
      deadLetterTask(this.state.queue, taskId)
    }
    this.state.pending = null
    this.pump()
    this.commit()
  }

  /** Route the held finished ingot to the scrap chute (DLQ). */
  classifyDlq(taskId: string): void {
    const pending = this.state.pending
    if (this.state.phase !== "running" || pending?.kind !== "classify") return
    if (pending.task.id !== taskId) return
    const task = this.requireTask(taskId)
    this.state.dlqClassifications++
    this.state.decisions = [...this.state.decisions, { type: "classify", taskId, route: "dlq" }]
    if (requiredRoute(task) === "dlq") this.state.dlqCorrect++
    deadLetterTask(this.state.queue, taskId)
    this.state.pending = null
    this.pump()
    this.commit()
  }

  /** R — send the gated forklift back (429 on full hopper / dedup on active sigil). */
  rejectInbound(): void {
    const pending = this.state.pending
    if (this.state.phase !== "running" || pending?.kind !== "gate") return
    this.state.gatesRejected++
    this.state.decisions = [...this.state.decisions, { type: "gate", action: "reject" }]
    this.state.arrivalIndex++
    this.state.pending = null
    this.pump()
    this.commit()
  }

  /** Skipping R: an overfull hopper overflows / a duplicate sigil gets enqueued. */
  admitInbound(): void {
    const pending = this.state.pending
    if (this.state.phase !== "running" || pending?.kind !== "gate") return
    this.state.decisions = [...this.state.decisions, { type: "gate", action: "admit" }]
    if (pending.reason === "full") {
      this.state.backpressureViolations++
      this.state.queue.queueOverflowed = true
    } else {
      this.state.duplicatesEnqueued++
    }
    this.enqueueArrival(pending.arrival)
    this.state.arrivalIndex++
    this.state.pending = null
    this.pump()
    this.commit()
  }

  /** Ground truth for the next grab (HUD hint + Playwright smoke drive). */
  truthPickId(): string | null {
    const truth = pickNext(this.state.queue.tasks, this.state.queue.now)
    return truth?.id ?? null
  }

  /** Ground truth for the held classify prompt. */
  truthRoute(): "retry" | "dlq" | null {
    const pending = this.state.pending
    if (pending?.kind !== "classify") return null
    return requiredRoute(pending.task)
  }

  queueDepthNow(): number {
    return queueDepth(this.state.queue)
  }

  backpressureNow(): string {
    return backpressure(queueDepth(this.state.queue), this.state.queue.capacity)
  }

  runningNow(): number {
    return runningCount(this.state.queue.workers)
  }

  private requireTask(id: string): SimTask {
    const task = this.state.queue.tasks.find((t) => t.id === id)
    if (!task) throw new Error(`unknown task ${id}`)
    return task
  }

  private jitter(): number {
    return this.rng() * this.state.level.backoffBase
  }

  private applyTransientFailure(task: SimTask): void {
    failTask(
      task,
      task.retries + 1,
      this.state.level.backoffBase,
      this.state.queue.now,
      this.jitter(),
    )
    for (const w of this.state.queue.workers) {
      if (w.busyWith === task.id) w.busyWith = null
    }
  }

  private enqueueArrival(spec: ArrivalSpec): void {
    const id = `t-${this.state.arrivalIndex}-${spec.label.replace(/\W+/g, "-")}`
    const task = makeTask(spec, id, this.state.level.maxRetries)
    this.state.queue.tasks.push(task)
  }

  /**
   * Advance the world event-by-event until a player decision is required or the
   * wave resolves. Pure with respect to (script, decisions, seed): no wall clock.
   */
  private pump(): void {
    const guard = 10_000
    for (let i = 0; i < guard; i++) {
      const q = this.state.queue
      const arrivalsDone = this.state.arrivalIndex >= this.state.level.arrivals.length
      if (arrivalsDone && (q.tasks.length === 0 || allTerminal(q))) {
        this.finishWave()
        return
      }
      promoteReady(q)

      // 1) arrivals due (script order; a gate interrupts the batch)
      const next = this.state.level.arrivals[this.state.arrivalIndex]
      if (next && next.at <= q.now) {
        if (hasActiveKey(q, next.idempotencyKey)) {
          this.state.pending = { kind: "gate", arrival: next, reason: "duplicate" }
          return
        }
        if (backpressure(queueDepth(q), q.capacity) === "full") {
          this.state.pending = { kind: "gate", arrival: next, reason: "full" }
          return
        }
        this.enqueueArrival(next)
        this.state.arrivalIndex++
        continue
      }

      // 2) completions (oldest start first). Parked arms hold their ingot.
      if (!q.paused) {
        const done = q.tasks
          .filter((t) => t.status === "running" && t.startedAt !== null)
          .filter((t) => (t.startedAt ?? 0) + this.state.level.serviceTime <= q.now)
          .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0) || a.id.localeCompare(b.id))
        const first = done[0]
        if (first) {
          if (first.kind === "poison" || first.failuresLeft > 0) {
            this.state.pending = { kind: "classify", task: first }
            return
          }
          succeedTask(q, first.id)
          continue
        }
      }

      // 3) dispatch prompt (never while paused — parked arms grab nothing)
      if (!q.paused) {
        const worker = idleWorker(q.workers)
        if (worker) {
          const candidates = dispatchOrder(q.tasks, q.now)
          if (candidates.length > 0) {
            this.state.pending = { kind: "dispatch", candidates }
            return
          }
        }
      }

      // 4) jump to the next event instant; parked => world waits for the player
      const nextTime = this.nextEventTime()
      if (nextTime === null) return
      q.now = nextTime
    }
    throw new Error("pump guard tripped (script loop?)")
  }

  private nextEventTime(): number | null {
    const q = this.state.queue
    const times: number[] = []
    const arrival = this.state.level.arrivals[this.state.arrivalIndex]
    if (arrival && arrival.at > q.now) times.push(arrival.at)
    for (const t of q.tasks) {
      if (t.status === "running" && !q.paused && t.startedAt !== null) {
        const finish = t.startedAt + this.state.level.serviceTime
        if (finish > q.now) times.push(finish)
      }
      if (t.status === "retry_wait" && t.nextAttemptAt !== null && t.nextAttemptAt > q.now) {
        times.push(t.nextAttemptAt)
      }
      if (t.status === "queued" && t.scheduledFor > q.now) times.push(t.scheduledFor)
    }
    if (times.length === 0) return null
    return Math.min(...times)
  }

  private finishWave(): void {
    const q = this.state.queue
    const s = this.state
    const outcome = evaluateQueueWave({
      kind: "voxeldojo-task-queue",
      dispatch_predictions: s.dispatchPredictions,
      dispatch_correct: s.dispatchCorrect,
      retry_classifications: s.retryClassifications,
      retry_correct: s.retryCorrect,
      dlq_classifications: s.dlqClassifications,
      dlq_correct: s.dlqCorrect,
      poison_requeued: s.poisonRequeued,
      backpressure_violations: s.backpressureViolations,
      idempotency_duplicates_enqueued: s.duplicatesEnqueued,
      queue_overflowed: q.queueOverflowed,
      max_concurrent_running: q.maxConcurrentRunning,
      worker_count: q.workers.length,
    })
    s.lastMetrics = { ...outcome.metrics }
    s.phase = outcome.pass ? "cleared" : "failed"
    s.pending = null
    emitEvidence(s.level.id, outcome.pass, outcome.metrics, {
      kind: `task-forge-${s.level.id}`,
      decisions: [...s.decisions],
    })
  }
}
