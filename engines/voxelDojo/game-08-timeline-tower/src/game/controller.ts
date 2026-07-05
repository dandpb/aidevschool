import { emitEvidence } from "../evidence/emit"
import {
  evaluateAppendOrder,
  evaluateProjection,
  evaluateReplay,
  evaluateTwoViews,
  type LevelConfig,
  type LevelId,
  LIFECYCLE_ORDER,
  levelConfig,
  STATUS_CHOICES,
} from "../sim/levels"
import {
  type Log,
  type OrderEvent,
  type OrderStatus,
  orderStatusProjection,
  project,
  shipmentListProjection,
} from "../sim/sourcing"

export type Phase = "briefing" | "playing" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  /** the deterministic event log for this level (the source of truth). */
  log: Log<OrderEvent>
  /** L1: which append step the player is on. */
  appendStep: number
  correctAppends: number
  /** L3: the checkpoint index the player must rewind to. */
  checkpointIndex: number
  /** L3: two-phase guess (checkpoint, then replay). */
  replayAtCheckpoint: OrderStatus | null
  /** L4: two-view guess accumulator. */
  twoViewOrderStatus: OrderStatus | null
  twoViewShipped: boolean | null
  lastMetrics: Record<string, number | boolean> | null
}

export type Listener = (state: GameState) => void

/**
 * Deterministic order-lifecycle scenarios, one per level. ts strictly increasing
 * so the log is well-ordered. The same log feeds L2/L3/L4; L1 uses the canonical
 * lifecycle ordering as its append-order truth.
 */
function scenarioFor(level: LevelId): { log: OrderEvent[]; checkpointIndex: number } {
  const base: OrderEvent[] = [
    {
      type: "OrderCreated",
      ts: 1,
      streamId: "ord-1",
      payload: { orderId: "ord-1", customerId: "cust-1", totalCents: 1299 },
    },
    { type: "PaymentAuthorized", ts: 2, streamId: "ord-1", payload: { orderId: "ord-1" } },
    { type: "InventoryReserved", ts: 3, streamId: "ord-1", payload: { orderId: "ord-1" } },
    { type: "OrderConfirmed", ts: 4, streamId: "ord-1", payload: { orderId: "ord-1" } },
    {
      type: "OrderShipped",
      ts: 5,
      streamId: "ord-1",
      payload: { orderId: "ord-1", trackingId: "trk-1", carrier: "post" },
    },
    { type: "OrderDelivered", ts: 6, streamId: "ord-1", payload: { orderId: "ord-1" } },
  ]
  // L4 uses a log that ends in cancelled (shipped=false) so the two views genuinely differ
  // from a delivered order and from each other.
  if (level === "L4") {
    return {
      log: [
        {
          type: "OrderCreated",
          ts: 1,
          streamId: "ord-2",
          payload: { orderId: "ord-2", customerId: "cust-2", totalCents: 4999 },
        },
        { type: "PaymentFailed", ts: 2, streamId: "ord-2", payload: { orderId: "ord-2" } },
        { type: "OrderCancelled", ts: 3, streamId: "ord-2", payload: { orderId: "ord-2" } },
      ],
      checkpointIndex: 2,
    }
  }
  return { log: base, checkpointIndex: 3 }
}

export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(level)
  }

  private freshState(level: LevelId): GameState {
    const { log, checkpointIndex } = scenarioFor(level)
    return {
      level: levelConfig(level),
      phase: "briefing",
      log,
      appendStep: 0,
      correctAppends: 0,
      checkpointIndex,
      replayAtCheckpoint: null,
      twoViewOrderStatus: null,
      twoViewShipped: null,
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
    this.state.phase = "playing"
    this.commit()
  }

  loadLevel(level: LevelId): void {
    this.state = this.freshState(level)
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

  // ── truth accessors (drive the scene + the smoke test deterministically) ──────

  /** Current status of the order after folding the whole log (the projection truth). */
  truthStatus(log: Log<OrderEvent> = this.state.log): OrderStatus {
    const orderId = log[0]?.streamId ?? ""
    return project(log, orderStatusProjection).get(orderId)?.status ?? "pending"
  }

  /** Whether the shipment_list projection contains the order. */
  truthShipped(log: Log<OrderEvent> = this.state.log): boolean {
    const orderId = log[0]?.streamId ?? ""
    return project(log, shipmentListProjection).has(orderId)
  }

  /** Status after folding only the events up to (not including) the checkpoint. */
  truthStatusAtCheckpoint(): OrderStatus {
    return this.truthStatus(this.state.log.slice(0, this.state.checkpointIndex))
  }

  /** L1: the canonical next event type the player should append at this step. */
  nextCorrectEventType(): OrderEvent["type"] {
    return LIFECYCLE_ORDER[this.state.appendStep] ?? "OrderDelivered"
  }

  /** L1: the choices offered at the current append step (the correct one + distractors). */
  appendChoices(): OrderEvent["type"][] {
    const correct = this.nextCorrectEventType()
    const distractors = LIFECYCLE_ORDER.filter((t) => t !== correct).slice(0, 3)
    return shuffle(distractors, this.state.appendStep).concat(correct)
  }

  // ── level actions ─────────────────────────────────────────────────────────────

  /** L1: player picks the next event type to append as the next floor. */
  appendNext(type: OrderEvent["type"]): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "playing") return
    const correct = this.nextCorrectEventType()
    if (type === correct) this.state.correctAppends++
    this.state.appendStep++
    if (this.state.appendStep >= LIFECYCLE_ORDER.length) {
      this.finishWave(evaluateAppendOrder(this.state.correctAppends, LIFECYCLE_ORDER.length))
    }
    this.commit()
  }

  /** L2: player predicts the final order status after folding every event. */
  predictStatus(status: OrderStatus): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "playing") return
    this.finishWave(evaluateProjection(this.state.log, { predictedStatus: status }))
    this.commit()
  }

  /** L3 step 1: predict status at the checkpoint. */
  predictAtCheckpoint(status: OrderStatus): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "playing") return
    this.state.replayAtCheckpoint = status
    this.commit()
  }

  /** L3 step 2: predict status after full replay → resolves the wave. */
  predictAfterReplay(status: OrderStatus): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "playing") return
    if (this.state.replayAtCheckpoint === null) return
    this.finishWave(
      evaluateReplay(this.state.log, this.state.checkpointIndex, {
        predictedAtCheckpoint: this.state.replayAtCheckpoint,
        predictedAfterReplay: status,
      }),
    )
    this.commit()
  }

  /** L4: pick the order_status view. */
  pickOrderStatus(status: OrderStatus): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "playing") return
    this.state.twoViewOrderStatus = status
    this.maybeResolveTwoViews()
    this.commit()
  }

  /** L4: pick the shipment_list view (is this order shipped?). */
  pickShipped(shipped: boolean): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "playing") return
    this.state.twoViewShipped = shipped
    this.maybeResolveTwoViews()
    this.commit()
  }

  private maybeResolveTwoViews(): void {
    if (this.state.twoViewOrderStatus === null || this.state.twoViewShipped === null) return
    this.finishWave(
      evaluateTwoViews(this.state.log, {
        predictedOrderStatus: this.state.twoViewOrderStatus,
        predictedShipped: this.state.twoViewShipped,
      }),
    )
  }

  /** Status choices the player can pick from in L2/L3/L4. */
  statusChoices(): readonly OrderStatus[] {
    return STATUS_CHOICES
  }

  private finishWave(outcome: { pass: boolean; metrics: Record<string, number | boolean> }): void {
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
  }
}

export const LEVELS: readonly LevelConfig[] = [
  levelConfig("L1"),
  levelConfig("L2"),
  levelConfig("L3"),
  levelConfig("L4"),
]

/** Deterministic shuffle keyed by a seed so the choice order is stable per step. */
function shuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items]
  let s = (seed + 1) >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j] as T, out[i] as T]
  }
  return out
}
