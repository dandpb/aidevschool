import { emitEvidence } from "../evidence/emit"
import {
  type Arrival,
  DOCK_WINDOW,
  emptyMetrics,
  evaluateWave,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  toTask,
  type WaveMetrics,
  WORK_BEATS,
} from "../sim/levels"
import {
  backpressure,
  dispatch as dispatchOntoPool,
  fail,
  isDuplicate,
  makePool,
  pickNext,
  runningCount,
  type Task,
  type WorkerPool,
} from "../sim/queue"
import { mulberry32 } from "../sim/rng"

export type Phase = "briefing" | "playing" | "cleared" | "failed"
export type Classification = "retry" | "dlq"

/**
 * Closed decision trace consumed by the independent TASK FORGE verifier
 * (learner/gate/task_queue_evaluator.py, contract pinned in PR-A2 #423):
 * one entry per answered prompt, in prompt order, with exactly the keys the
 * replay accepts. The trace records what the player actually did (wrong
 * predictions included) and is never reordered — a match played with pauses
 * may answer prompts in an order that diverges from the verifier's no-pause
 * replay and is then rejected fail-closed, never accepted by self-declared
 * metrics. In this controller a gate prompt is answered explicitly only on
 * R (reject); admitting happens by letting the dock window close, so gate
 * entries carry "reject" (the "admit" arm of the contract exists for
 * producers with an explicit admit action).
 */
export type TraceDecision =
  | { readonly type: "dispatch"; readonly taskId: string }
  | { readonly type: "classify"; readonly taskId: string; readonly route: "retry" | "dlq" }
  | { readonly type: "gate"; readonly action: "reject" | "admit" }

export interface RunningTask {
  readonly task: Task
  readonly completesAt: number
}

/** A finished ingot awaiting the player's retry/DLQ classification. */
export interface FinishedTask {
  readonly task: Task
  /** the queue-contract truth (HUD hides it; tests/smoke read it via hooks) */
  readonly correctRoute: Classification
  readonly retryAt: number
}

export interface GameState {
  readonly level: LevelConfig
  readonly phase: Phase
  /** sim clock — one beat per player action (+ auto-beats while nothing is actionable) */
  readonly now: number
  readonly paused: boolean
  readonly scriptIndex: number
  /** forklift currently docking; lands on its own when the dock window closes */
  readonly inbound: Arrival | null
  readonly dockDeadline: number
  readonly queue: readonly Task[]
  readonly running: readonly RunningTask[]
  readonly finished: readonly FinishedTask[]
  readonly succeededIds: readonly string[]
  readonly dlqIds: readonly string[]
  readonly metrics: WaveMetrics
  readonly lastMetrics: WaveMetrics | null
  readonly status: string
  readonly wrongfulRejects: number
}

export type Listener = (state: GameState) => void

const SETTLE_CAP = 10_000

/**
 * TASK FORGE controller — turn-based, deterministic (same action sequence ⇒
 * same wave, same evidence). Each player action advances the clock one beat;
 * auto-events (completions, inbound landings, countdowns) are processed
 * between actions in `settle()`. The player's four actions mirror plan §5:
 * click an ingot (dispatch prediction), click rack/chute (classify), R
 * (reject inbound), P (pause workers).
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []
  private rng: () => number
  private pool: WorkerPool
  private dispatchLog: Array<{ expected: string; picked: string }> = []
  private classificationLog: Array<{ task: string; route: Classification; correct: boolean }> = []
  /** decisions answered this wave, emitted as observations (verifier contract, AID-1906) */
  private decisions: TraceDecision[] = []

  constructor(level: LevelId = "L1") {
    const cfg = levelConfig(level)
    this.state = this.freshState(cfg)
    this.rng = mulberry32(cfg.seed)
    this.pool = makePool(cfg.workerCount)
  }

  private freshState(cfg: LevelConfig): GameState {
    return {
      level: cfg,
      phase: "briefing",
      now: 0,
      paused: false,
      scriptIndex: 0,
      inbound: null,
      dockDeadline: 0,
      queue: [],
      running: [],
      finished: [],
      succeededIds: [],
      dlqIds: [],
      metrics: emptyMetrics(cfg.workerCount),
      lastMetrics: null,
      status: "Pronto para iniciar.",
      wrongfulRejects: 0,
    }
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  private commit(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn(this.state)
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  start(): void {
    const cfg = this.state.level
    this.rng = mulberry32(cfg.seed)
    this.pool = makePool(cfg.workerCount)
    this.dispatchLog = []
    this.classificationLog = []
    this.decisions = []
    this.commit({ phase: "playing", status: "A forja está ligada." })
    this.settle()
  }

  loadLevel(level: LevelId): void {
    const cfg = levelConfig(level)
    this.state = this.freshState(cfg)
    this.rng = mulberry32(cfg.seed)
    this.pool = makePool(cfg.workerCount)
    this.dispatchLog = []
    this.classificationLog = []
    this.decisions = []
    this.commit({})
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

  // ── truth hooks (HUD hints, scene, smoke) ──────────────────────────────────

  /** The ingot the next idle arm WILL grab (queue-contract truth). */
  expectedDispatchId(): string | null {
    if (this.state.phase !== "playing" || this.state.paused) return null
    if (runningCount(this.pool) >= this.pool.workerCount) return null
    return pickNext(this.state.queue, this.state.now)?.id ?? null
  }

  /** Is a dispatch window open (idle arm + eligible ingot)? */
  dispatchWindowOpen(): boolean {
    return this.expectedDispatchId() !== null
  }

  /** Oldest finished ingot awaiting classification. */
  headFinished(): FinishedTask | null {
    return this.state.finished[0] ?? null
  }

  /** Must the docking forklift be rejected (dup sigil or full hopper)? */
  inboundRequiresReject(): boolean {
    const inbound = this.state.inbound
    if (!inbound) return false
    if (isDuplicate(this.activeKeys(), toTask(inbound, this.state.now))) return true
    return backpressure(this.state.queue.length, this.state.level.capacity) === "full"
  }

  /** Queue depth vs capacity for the HUD gauge (N/capacity). */
  queueDepth(): { depth: number; capacity: number } {
    return { depth: this.state.queue.length, capacity: this.state.level.capacity }
  }

  private activeKeys(): Set<string> {
    const keys = new Set<string>()
    for (const t of this.state.queue) keys.add(t.idempotencyKey)
    for (const r of this.state.running) keys.add(r.task.idempotencyKey)
    for (const f of this.state.finished) keys.add(f.task.idempotencyKey)
    return keys
  }

  // ── player actions ─────────────────────────────────────────────────────────

  /**
   * Predict the ingot the next idle arm grabs (plan §4.2). The truth is
   * `pickNext` at `now`; the arm then takes the TRUE ingot regardless, so a
   * wrong prediction never corrupts the sim — it only misses the recall.
   */
  predictDispatch(taskId: string): void {
    if (this.state.phase !== "playing" || this.state.paused) return
    const truth = pickNext(this.state.queue, this.state.now)
    if (!truth) return
    const res = dispatchOntoPool(this.pool, truth, this.state.now)
    if (!res.ok) return
    this.pool = res.pool
    const correct = truth.id === taskId
    const running = [
      ...this.state.running,
      { task: truth, completesAt: this.state.now + WORK_BEATS },
    ]
    const metrics: WaveMetrics = {
      ...this.state.metrics,
      dispatch_predictions: this.state.metrics.dispatch_predictions + 1,
      dispatch_correct: this.state.metrics.dispatch_correct + (correct ? 1 : 0),
      max_concurrent_running: Math.max(
        this.state.metrics.max_concurrent_running,
        runningCount(this.pool),
      ),
    }
    this.dispatchLog.push({ expected: truth.id, picked: taskId })
    // trace the player's prediction (wrong ids included), not the truth
    this.decisions = [...this.decisions, { type: "dispatch", taskId }]
    this.commit({
      queue: this.state.queue.filter((t) => t.id !== truth.id),
      running,
      metrics,
      status: correct
        ? `Previsão certa: ${truth.id} (prioridade ${truth.priority}) foi ao braço.`
        : `Previsão errada: o braço pegou ${truth.id}, não ${taskId}.`,
    })
    this.tick()
  }

  /** Route the oldest finished ingot to the annealing rack (retry). */
  classifyRetry(): void {
    this.classify("retry")
  }

  /** Route the oldest finished ingot to the scrap chute (DLQ). */
  classifyDlq(): void {
    this.classify("dlq")
  }

  private classify(choice: Classification): void {
    if (this.state.phase !== "playing") return
    const head = this.state.finished[0]
    if (!head) return
    const { task, correctRoute, retryAt } = head
    const finished = this.state.finished.slice(1)
    const metrics = { ...this.state.metrics }
    const queue = [...this.state.queue]
    const dlqIds = [...this.state.dlqIds]
    let status: string

    if (choice === "retry") {
      metrics.retry_classifications++
      if (correctRoute === "retry") {
        metrics.retry_correct++
        // backoff already computed by fail() when the ingot came off the arm
        queue.push({ ...task, retries: task.retries + 1, scheduledFor: retryAt })
        status = `Certo: ${task.id} descansa no rack; volta a ser elegível no beat ${retryAt}.`
      } else {
        // requeueing a must-DLQ ingot is the canonical queue pathology; the
        // budget is forced past max so the next completion presents DLQ again
        // (wave terminates; the pass rule already records the violation)
        metrics.poison_requeued++
        queue.push({ ...task, retries: task.maxRetries + 1, scheduledFor: retryAt })
        status = `Errado: ${task.id} não tem mais retry — poison/exausto voltou ao funil.`
      }
    } else {
      metrics.dlq_classifications++
      if (correctRoute === "dlq") {
        metrics.dlq_correct++
        status = `Certo: ${task.id} foi para a calha de sucata (DLQ).`
      } else {
        status = `Errado: ${task.id} ainda tinha retry — foi pro DLQ cedo demais.`
      }
      dlqIds.push(task.id)
    }

    this.classificationLog.push({ task: task.id, route: choice, correct: choice === correctRoute })
    this.decisions = [...this.decisions, { type: "classify", taskId: task.id, route: choice }]
    this.commit({ finished, queue, dlqIds, metrics, status })
    this.tick()
  }

  /** R — reject the docking forklift (backpressure 429 / idempotency dup). */
  rejectInbound(): void {
    if (this.state.phase !== "playing") return
    const inbound = this.state.inbound
    if (!inbound) return
    const required = this.inboundRequiresReject()
    this.decisions = [...this.decisions, { type: "gate", action: "reject" }]
    this.commit({
      inbound: null,
      scriptIndex: this.state.scriptIndex + 1,
      wrongfulRejects: this.state.wrongfulRejects + (required ? 0 : 1),
      status: required
        ? `429 certo: a empilhadeira ${inbound.id} voltou de onde veio.`
        : `429 indevido: ${inbound.id} tinha vaga (o funil aceitaria).`,
    })
    this.tick()
  }

  /** P — park/resume the arms (worker_count 0 ↔ N, RF-006). */
  togglePause(): void {
    if (this.state.phase !== "playing") return
    const paused = !this.state.paused
    this.commit({
      paused,
      status: paused
        ? "Braços estacionados (worker_count = 0): a fila continua aceitando — 200, não erro."
        : "Braços de volta ao trabalho.",
    })
    this.tick()
  }

  // ── sim engine (deterministic) ─────────────────────────────────────────────

  /** One beat of auto time after a player action. */
  private tick(): void {
    this.commit({ now: this.state.now + 1 })
    this.processAutoEvents()
    this.settle()
  }

  /** Auto-advance beats while no player decision is available. */
  private settle(): void {
    for (let i = 0; i < SETTLE_CAP; i++) {
      if (this.waveEnded()) {
        this.finishWave()
        return
      }
      // A parked forge (P) always leaves the player the unpause action —
      // freeze auto-time instead of spinning (backlog grows on landing only).
      if (this.state.paused) return
      if (this.playerDecisionAvailable()) return
      this.commit({ now: this.state.now + 1 })
      this.processAutoEvents()
    }
    throw new Error("settle() exceeded cap — wave cannot progress (sim regression)")
  }

  private playerDecisionAvailable(): boolean {
    return (
      this.state.finished.length > 0 ||
      this.dispatchWindowOpen() ||
      (this.state.inbound !== null && this.inboundRequiresReject())
    )
  }

  private processAutoEvents(): void {
    const s = this.state
    let running = s.running
    let finished = s.finished
    let queue = s.queue
    let inbound = s.inbound
    let dockDeadline = s.dockDeadline
    let scriptIndex = s.scriptIndex
    let metrics = s.metrics
    let succeededIds = s.succeededIds

    // 1. completions (paused arms hold their ingots mid-flame)
    if (!s.paused) {
      const stillRunning: RunningTask[] = []
      for (const slot of running) {
        if (slot.completesAt > s.now) {
          stillRunning.push(slot)
          continue
        }
        this.pool = this.releaseSlot(this.pool, slot.task.id)
        if (slot.task.kind === "clear") {
          succeededIds = [...succeededIds, slot.task.id]
        } else {
          const plan = fail(slot.task, this.rng, s.now)
          finished = [
            ...finished,
            { task: slot.task, correctRoute: plan.action, retryAt: plan.nextAttemptAt },
          ]
        }
      }
      running = stillRunning
    }

    // 2. inbound lands when its dock window closes (skipping R has a cost)
    if (inbound && s.now >= dockDeadline) {
      const task = toTask(inbound, s.now)
      if (isDuplicate(this.activeKeysWith(queue, running, finished), task)) {
        metrics = {
          ...metrics,
          idempotency_duplicates_enqueued: metrics.idempotency_duplicates_enqueued + 1,
        }
      } else if (backpressure(queue.length, s.level.capacity) === "full") {
        metrics = {
          ...metrics,
          queue_overflowed: true,
          backpressure_violations: metrics.backpressure_violations + 1,
        }
      } else {
        queue = [...queue, task]
      }
      inbound = null
      scriptIndex += 1
    }

    // 3. present the next arrival
    const script = s.level.arrivals
    const next = script[scriptIndex]
    if (!inbound && next && s.now >= next.arrivesAt) {
      inbound = next
      dockDeadline = s.now + DOCK_WINDOW
    }

    this.commit({
      running,
      finished,
      queue,
      inbound,
      dockDeadline,
      scriptIndex,
      metrics,
      succeededIds,
    })
  }

  private activeKeysWith(
    queue: readonly Task[],
    running: readonly RunningTask[],
    finished: readonly FinishedTask[],
  ): Set<string> {
    const keys = new Set<string>()
    for (const t of queue) keys.add(t.idempotencyKey)
    for (const r of running) keys.add(r.task.idempotencyKey)
    for (const f of finished) keys.add(f.task.idempotencyKey)
    return keys
  }

  private releaseSlot(pool: WorkerPool, taskId: string): WorkerPool {
    return {
      ...pool,
      slots: pool.slots.map((slot) => (slot.taskId === taskId ? { taskId: null } : slot)),
    }
  }

  private waveEnded(): boolean {
    const s = this.state
    return (
      s.phase === "playing" &&
      s.scriptIndex >= s.level.arrivals.length &&
      s.inbound === null &&
      s.queue.length === 0 &&
      s.running.length === 0 &&
      s.finished.length === 0
    )
  }

  private finishWave(): void {
    const metrics = this.state.metrics
    const pass = evaluateWave(metrics)
    this.commit({
      phase: pass ? "cleared" : "failed",
      lastMetrics: metrics,
      status: pass
        ? "Onda concluída; evidência emitida."
        : "Critério do contrato não atendido; tente novamente.",
    })
    emitEvidence(
      this.state.level.id,
      pass,
      { ...metrics },
      {
        kind: `task-forge-${this.state.level.id}`,
        decisions: this.decisions.slice(),
      },
    )
  }
}
