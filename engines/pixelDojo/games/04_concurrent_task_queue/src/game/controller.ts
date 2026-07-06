// TASK FORGE wave controller. Drives the deterministic L1 wave: priority +
// FIFO dispatch, retry/backoff, poison DLQ, backpressure reject, idempotency
// reject, concurrency invariant. All rules live in src/sim/queue.ts; this
// controller sequences them into a playable wave and emits one evidence
// record on clear.

import {
  activeSigilsOf,
  type BackpressureState,
  backpressure,
  makeTask,
  mulberry32,
  pickNext,
  type Task,
  type TaskKind,
} from "../sim/queue"
import { emitEvidence, type GateName } from "./evidence/emit"

export type Phase = "briefing" | "predicting" | "classifying" | "boundary" | "cleared" | "failed"

export interface WaveTaskDef {
  readonly id: string
  readonly sigil: string
  readonly priority: number
  readonly kind: TaskKind
}

export type WaveEvent =
  | { readonly kind: "start" }
  | {
      readonly kind: "arrival"
      readonly def: WaveTaskDef
      readonly expected: "accept" | "reject"
      readonly reason: "hopper-open" | "idempotency" | "backpressure"
    }
  | {
      readonly kind: "predict"
      readonly expectedId: string
      readonly outcome: "success" | "transient" | "poison"
    }
  | {
      readonly kind: "outcome"
      readonly taskId: string
      readonly result: "success" | "transient" | "poison"
    }
  | { readonly kind: "classify"; readonly taskId: string; readonly expected: "retry" | "dlq" }
  | { readonly kind: "cleared" }

export const WORKER_COUNT = 3
export const CAPACITY = 3
export const MAX_RETRIES = 1
export const BASE_BACKOFF = 4

/** The L1 wave — see docs/plans/04_concurrent_task_queue.md §3 + §4. */
export const WAVE: readonly WaveEvent[] = [
  { kind: "start" },
  {
    kind: "arrival",
    def: { id: "t1", sigil: "A", priority: 5, kind: "clear" },
    expected: "accept",
    reason: "hopper-open",
  },
  {
    kind: "arrival",
    def: { id: "t2", sigil: "B", priority: 8, kind: "clear" },
    expected: "accept",
    reason: "hopper-open",
  },
  {
    kind: "arrival",
    def: { id: "t3", sigil: "C", priority: 3, kind: "transient" },
    expected: "accept",
    reason: "hopper-open",
  },
  { kind: "predict", expectedId: "t2", outcome: "success" },
  {
    kind: "arrival",
    def: { id: "t4", sigil: "D", priority: 7, kind: "poison" },
    expected: "accept",
    reason: "hopper-open",
  },
  { kind: "predict", expectedId: "t4", outcome: "poison" },
  { kind: "predict", expectedId: "t1", outcome: "success" },
  { kind: "outcome", taskId: "t2", result: "success" },
  { kind: "outcome", taskId: "t1", result: "success" },
  { kind: "outcome", taskId: "t4", result: "poison" },
  { kind: "classify", taskId: "t4", expected: "dlq" },
  { kind: "predict", expectedId: "t3", outcome: "transient" },
  { kind: "outcome", taskId: "t3", result: "transient" },
  { kind: "classify", taskId: "t3", expected: "retry" },
  {
    kind: "arrival",
    def: { id: "t5", sigil: "E", priority: 6, kind: "clear" },
    expected: "accept",
    reason: "hopper-open",
  },
  {
    kind: "arrival",
    def: { id: "t6", sigil: "C", priority: 4, kind: "clear" },
    expected: "reject",
    reason: "idempotency",
  },
  {
    kind: "arrival",
    def: { id: "t7", sigil: "F", priority: 9, kind: "clear" },
    expected: "accept",
    reason: "hopper-open",
  },
  {
    kind: "arrival",
    def: { id: "t8", sigil: "G", priority: 2, kind: "clear" },
    expected: "reject",
    reason: "backpressure",
  },
  { kind: "predict", expectedId: "t7", outcome: "success" },
  { kind: "outcome", taskId: "t7", result: "success" },
  { kind: "predict", expectedId: "t5", outcome: "success" },
  { kind: "outcome", taskId: "t5", result: "success" },
  { kind: "predict", expectedId: "t3", outcome: "success" },
  { kind: "outcome", taskId: "t3", result: "success" },
  { kind: "cleared" },
] as const

export interface Metrics {
  readonly dispatchPredictions: number
  readonly dispatchCorrect: number
  readonly retryClassifications: number
  readonly retryCorrect: number
  readonly dlqClassifications: number
  readonly dlqCorrect: number
  readonly poisonRequeued: number
  readonly backpressureViolations: number
  readonly idempotencyDuplicatesEnqueued: number
  readonly queueOverflowed: boolean
  readonly maxConcurrentRunning: number
}

export interface PublicAction {
  readonly phase: Phase
  readonly ingotId?: string
  readonly route?: "retry" | "dlq"
  readonly action?: "accept" | "reject"
  readonly reason?: "hopper-open" | "idempotency" | "backpressure"
}

export interface GameState {
  readonly phase: Phase
  readonly tasks: Task[]
  readonly runningCount: number
  readonly workerCount: number
  readonly capacity: number
  readonly pendingArrival: WaveTaskDef | null
  readonly pendingArrivalReason: "hopper-open" | "idempotency" | "backpressure" | null
  readonly pendingClassifyTaskId: string | null
  readonly cursor: number
  readonly lastMetrics: Metrics | null
  readonly lastBackpressure: BackpressureState
}

export type Listener = (state: GameState) => void

export class GameController {
  private state: GameState
  private listeners: Listener[] = []
  private rng: () => number = mulberry32(0xc0ffee)
  private metrics: Metrics = {
    dispatchPredictions: 0,
    dispatchCorrect: 0,
    retryClassifications: 0,
    retryCorrect: 0,
    dlqClassifications: 0,
    dlqCorrect: 0,
    poisonRequeued: 0,
    backpressureViolations: 0,
    idempotencyDuplicatesEnqueued: 0,
    queueOverflowed: false,
    maxConcurrentRunning: 0,
  }

  constructor() {
    this.state = {
      phase: "briefing",
      tasks: [],
      runningCount: 0,
      workerCount: WORKER_COUNT,
      capacity: CAPACITY,
      pendingArrival: null,
      pendingArrivalReason: null,
      pendingClassifyTaskId: null,
      cursor: 0,
      lastMetrics: null,
      lastBackpressure: "open",
    }
    this.applyAutoEvents()
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  /** Deterministic ground truth for the current player step (test hook). */
  correctAction(): PublicAction {
    const ev = WAVE[this.state.cursor]
    if (!ev) return { phase: this.state.phase }
    switch (ev.kind) {
      case "start":
        return { phase: "briefing" }
      case "arrival":
        return { phase: "boundary", action: ev.expected, reason: ev.reason }
      case "predict":
        return { phase: "predicting", ingotId: ev.expectedId }
      case "classify":
        return { phase: "classifying", route: ev.expected }
      case "cleared":
        return { phase: "cleared" }
      default:
        return { phase: this.state.phase }
    }
  }

  // --- Player actions -----------------------------------------------------

  start(): void {
    if (this.state.phase !== "briefing") return
    this.advance()
  }

  acceptArrival(): void {
    if (this.state.phase !== "boundary") return
    const ev = WAVE[this.state.cursor]
    if (ev?.kind !== "arrival") return
    if (ev.expected === "reject") {
      // Player accepted something that should have been rejected.
      if (ev.reason === "backpressure") {
        this.metrics = {
          ...this.metrics,
          backpressureViolations: this.metrics.backpressureViolations + 1,
          queueOverflowed: true,
        }
      } else if (ev.reason === "idempotency") {
        this.metrics = {
          ...this.metrics,
          idempotencyDuplicatesEnqueued: this.metrics.idempotencyDuplicatesEnqueued + 1,
        }
      }
    } else {
      // Correctly accepted. Enqueue the task — unless the hopper is full
      // (defensive: should not happen on a correct wave, but keep the truth).
      const depth = this.queueDepth()
      if (depth >= this.state.capacity) {
        this.metrics = {
          ...this.metrics,
          backpressureViolations: this.metrics.backpressureViolations + 1,
          queueOverflowed: true,
        }
      } else {
        this.state.tasks.push(
          makeTask({ ...ev.def, maxRetries: MAX_RETRIES, arrivalTick: this.state.cursor }),
        )
      }
    }
    this.advance()
  }

  rejectArrival(): void {
    if (this.state.phase !== "boundary") return
    const ev = WAVE[this.state.cursor]
    if (ev?.kind !== "arrival") return
    if (ev.expected === "accept") {
      // Player rejected a healthy arrival — count as a backpressure-style
      // violation (queue contract misread). No task enqueued.
      this.metrics = {
        ...this.metrics,
        backpressureViolations: this.metrics.backpressureViolations + 1,
      }
    }
    // Correct reject: do nothing (task never enters the queue).
    this.advance()
  }

  predictIngot(ingotId: string): void {
    if (this.state.phase !== "predicting") return
    const ev = WAVE[this.state.cursor]
    if (ev?.kind !== "predict") return
    this.metrics = { ...this.metrics, dispatchPredictions: this.metrics.dispatchPredictions + 1 }
    if (ingotId === ev.expectedId) {
      this.metrics = { ...this.metrics, dispatchCorrect: this.metrics.dispatchCorrect + 1 }
    }
    // Mutate the sim truth: the predicted task is the one pickNext would
    // choose. Find it and mark running.
    const now = this.state.cursor
    const next = pickNext(this.state.tasks, now)
    if (next) {
      next.status = "running"
      this.state = { ...this.state, runningCount: this.state.runningCount + 1 }
      this.metrics = {
        ...this.metrics,
        maxConcurrentRunning: Math.max(this.metrics.maxConcurrentRunning, this.state.runningCount),
      }
    }
    this.advance()
  }

  classifyRetry(): void {
    if (this.state.phase !== "classifying") return
    const ev = WAVE[this.state.cursor]
    if (ev?.kind !== "classify") return
    const task = this.state.tasks.find((t) => t.id === ev.taskId)
    if (!task) return
    this.metrics = { ...this.metrics, retryClassifications: this.metrics.retryClassifications + 1 }
    if (ev.expected === "retry") {
      this.metrics = { ...this.metrics, retryCorrect: this.metrics.retryCorrect + 1 }
      // Apply retry: transient only; poison would be a contract violation.
      if (task.kind === "poison") {
        this.metrics = { ...this.metrics, poisonRequeued: this.metrics.poisonRequeued + 1 }
      }
      task.retries += 1
      task.scheduledFor = this.state.cursor + BASE_BACKOFF + Math.floor(this.rng() * 100) / 100
      task.status = "retrying"
    } else {
      // Player retried something that should have been DLQ'd.
      if (task.kind === "poison") {
        this.metrics = { ...this.metrics, poisonRequeued: this.metrics.poisonRequeued + 1 }
      }
      // Still push it to retry to mirror player action, but the metrics
      // already record the mis-classification.
      task.retries += 1
      task.scheduledFor = this.state.cursor + BASE_BACKOFF
      task.status = "retrying"
    }
    this.advance()
  }

  classifyDlq(): void {
    if (this.state.phase !== "classifying") return
    const ev = WAVE[this.state.cursor]
    if (ev?.kind !== "classify") return
    const task = this.state.tasks.find((t) => t.id === ev.taskId)
    if (!task) return
    this.metrics = { ...this.metrics, dlqClassifications: this.metrics.dlqClassifications + 1 }
    if (ev.expected === "dlq") {
      this.metrics = { ...this.metrics, dlqCorrect: this.metrics.dlqCorrect + 1 }
    }
    task.status = "dlq"
    this.advance()
  }

  // --- Internal progression ----------------------------------------------

  private advance(): void {
    this.state = { ...this.state, cursor: this.state.cursor + 1 }
    this.applyAutoEvents()
    this.updatePhase()
    this.commit()
  }

  /** Process any non-player events (outcome / cleared) at the current cursor. */
  private applyAutoEvents(): void {
    while (true) {
      const ev = WAVE[this.state.cursor]
      if (!ev) break
      if (ev.kind === "outcome") {
        this.processOutcome(ev)
        this.state = { ...this.state, cursor: this.state.cursor + 1 }
        continue
      }
      if (ev.kind === "cleared") {
        this.finishWave()
        this.state = { ...this.state, cursor: this.state.cursor + 1 }
        break
      }
      break
    }
  }

  private processOutcome(ev: {
    readonly taskId: string
    readonly result: "success" | "transient" | "poison"
  }): void {
    const task = this.state.tasks.find((t) => t.id === ev.taskId)
    if (!task) return
    if (this.state.runningCount > 0) {
      this.state = { ...this.state, runningCount: this.state.runningCount - 1 }
    }
    if (ev.result === "success") {
      task.status = "done"
    } else {
      // transient or poison → needs classify (worker freed; task awaits route)
      task.status = "needs-classify"
    }
  }

  private updatePhase(): void {
    const ev = WAVE[this.state.cursor]
    if (!ev) {
      this.state = { ...this.state, phase: "cleared" }
      return
    }
    let pendingArrival: WaveTaskDef | null = null
    let pendingReason: "hopper-open" | "idempotency" | "backpressure" | null = null
    let pendingClassifyId: string | null = null
    let phase: Phase = this.state.phase
    switch (ev.kind) {
      case "start":
        phase = "briefing"
        break
      case "arrival":
        phase = "boundary"
        pendingArrival = ev.def
        pendingReason = ev.reason
        break
      case "predict":
        phase = "predicting"
        break
      case "classify":
        phase = "classifying"
        pendingClassifyId = ev.taskId
        break
      case "cleared":
        phase = "cleared"
        break
      default:
        phase = this.state.phase
    }
    this.state = {
      ...this.state,
      phase,
      pendingArrival,
      pendingArrivalReason: pendingReason,
      pendingClassifyTaskId: pendingClassifyId,
      lastBackpressure: backpressure(this.queueDepth(), this.state.capacity),
    }
  }

  private finishWave(): void {
    const gates: GateName[] = []
    const dispatchOk =
      this.metrics.dispatchPredictions === 0
        ? false
        : this.metrics.dispatchCorrect / this.metrics.dispatchPredictions >= 0.8
    if (dispatchOk) gates.push("priority-fifo-dispatch")
    if (
      this.metrics.retryCorrect === this.metrics.retryClassifications &&
      this.metrics.retryClassifications > 0
    ) {
      gates.push("retry-backoff")
    }
    if (
      this.metrics.dlqCorrect === this.metrics.dlqClassifications &&
      this.metrics.poisonRequeued === 0 &&
      this.metrics.dlqClassifications > 0
    ) {
      gates.push("poison-dlq")
    }
    if (this.metrics.backpressureViolations === 0 && !this.metrics.queueOverflowed) {
      gates.push("backpressure")
    }
    if (this.metrics.idempotencyDuplicatesEnqueued === 0) gates.push("idempotency")
    if (this.metrics.maxConcurrentRunning <= this.state.workerCount)
      gates.push("concurrency-invariant")

    const pass =
      dispatchOk &&
      (this.metrics.retryClassifications === 0 ||
        this.metrics.retryCorrect === this.metrics.retryClassifications) &&
      (this.metrics.dlqClassifications === 0 ||
        this.metrics.dlqCorrect === this.metrics.dlqClassifications) &&
      this.metrics.poisonRequeued === 0 &&
      this.metrics.backpressureViolations === 0 &&
      this.metrics.idempotencyDuplicatesEnqueued === 0 &&
      !this.metrics.queueOverflowed &&
      this.metrics.maxConcurrentRunning <= this.state.workerCount

    const record: Metrics = { ...this.metrics }
    this.state = { ...this.state, lastMetrics: record, phase: pass ? "cleared" : "failed" }

    emitEvidence({
      scenario_id: "task-forge-L1",
      pass,
      gates,
      metrics: {
        kind: "task-forge-task-queue",
        dispatch_predictions: record.dispatchPredictions,
        dispatch_correct: record.dispatchCorrect,
        retry_classifications: record.retryClassifications,
        retry_correct: record.retryCorrect,
        dlq_classifications: record.dlqClassifications,
        dlq_correct: record.dlqCorrect,
        poison_requeued: record.poisonRequeued,
        backpressure_violations: record.backpressureViolations,
        idempotency_duplicates_enqueued: record.idempotencyDuplicatesEnqueued,
        queue_overflowed: record.queueOverflowed,
        max_concurrent_running: record.maxConcurrentRunning,
        worker_count: this.state.workerCount,
      },
      scheduled_review: false,
    })
  }

  private queueDepth(): number {
    return this.state.tasks.filter(
      (t) => t.status === "queued" || t.status === "retrying" || t.status === "needs-classify",
    ).length
  }

  /** Active sigils set — exposed for the HUD/scene to highlight duplicates. */
  activeSigils(): Set<string> {
    return activeSigilsOf(this.state.tasks)
  }

  private commit(): void {
    for (const fn of this.listeners) fn(this.state)
  }
}
