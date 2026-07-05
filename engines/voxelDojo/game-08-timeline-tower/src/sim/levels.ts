import {
  type Log,
  type OrderEvent,
  type OrderStatus,
  type OrderStatusProjectionState,
  orderStatusProjection,
  project,
  type ShipmentListProjectionState,
  shipmentListProjection,
} from "./sourcing"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Stack the events",
    lesson:
      "An event log is an append-only stack: oldest at the bottom, newest on top. Predict the next floor.",
    passRule: "Predict ≥80% of the next-event append order.",
  },
  {
    id: "L2",
    title: "Build the projection",
    lesson:
      "A projection is built by folding the log in order. Predict the read-model state it produces.",
    passRule: "Predict the order's final status after folding every event.",
  },
  {
    id: "L3",
    title: "Replay",
    lesson:
      "Replay = re-run the fold. Rewind to a checkpoint, then rebuild upward — same log, same answer.",
    passRule: "Predict the status at the checkpoint AND after full replay.",
  },
  {
    id: "L4",
    title: "Two views",
    lesson:
      "One log, many projections. The order_status and shipment_list views fold the SAME log differently.",
    passRule: "Predict both derived views from the same event stack.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

// ──────────────────────────────────────────────────────────────────────────────
// L1 — "Stack the events": predict the append order (next floor).
// The player is shown an order scenario as a list of lifecycle steps; for each
// step they predict which event type appends next. A correct ordering proves the
// player understands the log as an ordered sequence of immutable transitions.
// ──────────────────────────────────────────────────────────────────────────────

export const LIFECYCLE_ORDER: readonly OrderEvent["type"][] = [
  "OrderCreated",
  "PaymentAuthorized",
  "InventoryReserved",
  "OrderConfirmed",
  "OrderShipped",
  "OrderDelivered",
] as const

/** L1 evaluation: fraction of next-event predictions the player got right. */
export function evaluateAppendOrder(correct: number, total: number): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8,
    metrics: {
      append_predictions: total,
      append_order_accuracy: round2(accuracy),
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// L2 — "Build the projection": fold to predict the read-model state.
// The player predicts the final status of an order after folding every event.
// ──────────────────────────────────────────────────────────────────────────────

export interface ProjectionGuess {
  predictedStatus: OrderStatus
}

export function evaluateProjection(log: Log<OrderEvent>, guess: ProjectionGuess): WaveOutcome {
  const state: OrderStatusProjectionState = project(log, orderStatusProjection)
  const orderId = log[0]?.streamId ?? ""
  const truth = state.get(orderId)?.status ?? "pending"
  const ok = truth === guess.predictedStatus
  return {
    pass: ok,
    metrics: {
      events_folded: log.length,
      predicted_status_ok: ok,
      final_status_correct: ok ? 1 : 0,
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// L3 — "Replay": rewind and rebuild from a checkpoint.
// The player predicts the order's status (a) at a checkpoint and (b) after full
// replay. Both must be right — proving replay deterministically rebuilds state.
// ──────────────────────────────────────────────────────────────────────────────

export interface ReplayGuess {
  predictedAtCheckpoint: OrderStatus
  predictedAfterReplay: OrderStatus
}

export function evaluateReplay(
  log: Log<OrderEvent>,
  checkpointIndex: number,
  guess: ReplayGuess,
): WaveOutcome {
  const orderId = log[0]?.streamId ?? ""
  const atCheckpoint =
    project(log.slice(0, checkpointIndex), orderStatusProjection).get(orderId)?.status ?? "pending"
  const afterReplay = project(log, orderStatusProjection).get(orderId)?.status ?? "pending"
  const checkOk = atCheckpoint === guess.predictedAtCheckpoint
  const replayOk = afterReplay === guess.predictedAfterReplay
  return {
    pass: checkOk && replayOk,
    metrics: {
      checkpoint_index: checkpointIndex,
      status_at_checkpoint_ok: checkOk,
      status_after_replay_ok: replayOk,
      replay_deterministic: checkOk && replayOk,
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// L4 — "Two views": same log, two projections. Predict BOTH derived views.
// ──────────────────────────────────────────────────────────────────────────────

export interface TwoViewGuess {
  predictedOrderStatus: OrderStatus
  predictedShipped: boolean
}

export function evaluateTwoViews(log: Log<OrderEvent>, guess: TwoViewGuess): WaveOutcome {
  const orderId = log[0]?.streamId ?? ""
  const status: OrderStatusProjectionState = project(log, orderStatusProjection)
  const shipments: ShipmentListProjectionState = project(log, shipmentListProjection)
  const truthStatus = status.get(orderId)?.status ?? "pending"
  const truthShipped = shipments.has(orderId)
  const statusOk = truthStatus === guess.predictedOrderStatus
  const shippedOk = truthShipped === guess.predictedShipped
  return {
    pass: statusOk && shippedOk,
    metrics: {
      order_status_view_ok: statusOk,
      shipment_list_view_ok: shippedOk,
      same_log_two_views: true,
      views_correct: (statusOk ? 1 : 0) + (shippedOk ? 1 : 0),
    },
  }
}

/** All order statuses the player can choose from in the projection levels. */
export const STATUS_CHOICES: readonly OrderStatus[] = [
  "pending",
  "payment_authorized",
  "payment_failed",
  "inventory_reserved",
  "inventory_rejected",
  "confirmed",
  "cancelled",
  "shipped",
  "delivered",
] as const

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
