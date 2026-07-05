// Event-sourcing core — headless, deterministic, ZERO three imports.
//
// The ONE concept this module teaches: the LOG is the source of truth and a
// PROJECTION is a derived, rebuildable read model built by folding the log in
// order. Replay = re-running the fold from the beginning (or a checkpoint).
// Events are immutable; append never mutates the prior log.

/** A single immutable domain event recorded on the log. */
export interface Event<P = unknown> {
  /** lifecycle type, e.g. OrderCreated / PaymentAuthorized / OrderShipped */
  type: string
  /** monotonic timestamp — the canonical ordering key (RNF-001: strictly increasing per stream). */
  ts: number
  /** aggregate the event belongs to (order id, customer id, …). */
  streamId: string
  /** deterministic payload describing the transition. */
  payload: P
}

/** An append-only event log. Readonly on purpose: you rebuild state by folding, never by editing. */
export type Log<E extends Event = Event> = readonly E[]

/** A projection is a named read model: an initial state plus a pure fold reducer. */
export interface Projection<S, E extends Event = Event> {
  /** stable name used by replay/project (e.g. "order_status", "shipment_list"). */
  name: string
  /** the empty read-model before any events are folded. */
  init: () => S
  /** pure reducer: previous read-model + one event ⇒ next read-model. */
  fold: (state: S, event: E) => S
}

// ──────────────────────────────────────────────────────────────────────────────
// append — the ONLY way to grow a log. Returns a NEW log; the argument is untouched.
// ──────────────────────────────────────────────────────────────────────────────

/** Append one event immutably. `log` is never mutated; a fresh array is returned. */
export function append<E extends Event>(log: Log<E>, event: E): Log<E> {
  return [...log, event]
}

/** Append many events immutably, preserving order. */
export function appendAll<E extends Event>(log: Log<E>, events: readonly E[]): Log<E> {
  return [...log, ...events]
}

// ──────────────────────────────────────────────────────────────────────────────
// fold / replay / project — rebuilding derived state from the immutable log.
// ──────────────────────────────────────────────────────────────────────────────

/** Fold ONE event onto a read-model state using the projection's reducer. */
export function fold<S, E extends Event>(projection: Projection<S, E>, state: S, event: E): S {
  return projection.fold(state, event)
}

/**
 * Replay a slice of the log through a projection, in ts order, starting at `fromIndex`.
 * `fromIndex` is a checkpoint: replay skips events before it (assumed already folded into `state`).
 * Deterministic: same log ⇒ same projection on every replay.
 */
export function replay<S, E extends Event>(
  log: Log<E>,
  projection: Projection<S, E>,
  fromIndex = 0,
  state?: S,
): S {
  const acc = state ?? projection.init()
  const slice = log.slice(fromIndex)
  // deterministic ordering by ts (stable: equal-ts events keep append order)
  const ordered = stableSortByTs(slice)
  let cur = acc
  for (const e of ordered) cur = projection.fold(cur, e)
  return cur
}

/** Full replay from the start of the log = the canonical way to (re)build a projection. */
export function project<S, E extends Event>(log: Log<E>, projection: Projection<S, E>): S {
  return replay(log, projection, 0)
}

/** Deterministic ordering helper: events are replayed in ascending-ts order, ties broken by log position. */
export function stableSortByTs<E extends Event>(events: readonly E[]): E[] {
  return events
    .map((e, i) => [e, i] as const)
    .sort((a, b) => a[0].ts - b[0].ts || a[1] - b[1])
    .map((pair) => pair[0])
}

/** A log is well-ordered when its ts values are strictly increasing in append order. */
export function isStrictlyOrdered<E extends Event>(log: Log<E>): boolean {
  for (let i = 1; i < log.length; i++) {
    if ((log[i] as E).ts <= (log[i - 1] as E).ts) return false
  }
  return true
}

/** Number of events in the log — the "height" of the tower. */
export function length<E extends Event>(log: Log<E>): number {
  return log.length
}

/** Index of the last event with ts ≤ checkpointTs; -1 when none. Used to compute replay windows. */
export function checkpointIndex<E extends Event>(log: Log<E>, checkpointTs: number): number {
  let idx = -1
  for (let i = 0; i < log.length; i++) {
    if ((log[i] as E).ts <= checkpointTs) idx = i
    else break
  }
  return idx
}

// ──────────────────────────────────────────────────────────────────────────────
// Order-lifecycle event payloads + two projections that fold the SAME log
// DIFFERENTLY. This is the L4 lesson: one log, many derived views.
// ──────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "payment_authorized"
  | "payment_failed"
  | "inventory_reserved"
  | "inventory_rejected"
  | "confirmed"
  | "cancelled"
  | "shipped"
  | "delivered"

export interface OrderCreatedPayload {
  orderId: string
  customerId: string
  totalCents: number
}
export interface OrderEventPayload {
  orderId: string
  reason?: string
}
export interface ShippedPayload extends OrderEventPayload {
  trackingId: string
  carrier: string
}

/** Canonical order-lifecycle event types (RF-002). */
export type OrderEvent =
  | (Event<OrderCreatedPayload> & { type: "OrderCreated" })
  | (Event<OrderEventPayload> & { type: "PaymentAuthorized" })
  | (Event<OrderEventPayload> & { type: "PaymentFailed" })
  | (Event<OrderEventPayload> & { type: "InventoryReserved" })
  | (Event<OrderEventPayload> & { type: "InventoryRejected" })
  | (Event<OrderEventPayload> & { type: "OrderConfirmed" })
  | (Event<OrderEventPayload> & { type: "OrderCancelled" })
  | (Event<ShippedPayload> & { type: "OrderShipped" })
  | (Event<OrderEventPayload> & { type: "OrderDelivered" })

// ── Projection A: order_status — current status of every order. ───────────────

export interface OrderStatusEntry {
  orderId: string
  status: OrderStatus
  customerId: string
  totalCents: number
  updatedAt: number
}
export type OrderStatusProjectionState = ReadonlyMap<string, OrderStatusEntry>

export const orderStatusProjection: Projection<OrderStatusProjectionState, OrderEvent> = {
  name: "order_status",
  init: () => new Map<string, OrderStatusEntry>(),
  fold(state, event) {
    const next = new Map(state)
    switch (event.type) {
      case "OrderCreated": {
        const { orderId, customerId, totalCents } = event.payload
        next.set(orderId, {
          orderId,
          status: "pending",
          customerId,
          totalCents,
          updatedAt: event.ts,
        })
        break
      }
      case "PaymentAuthorized":
        updateStatus(next, event.payload.orderId, "payment_authorized", event.ts)
        break
      case "PaymentFailed":
        updateStatus(next, event.payload.orderId, "payment_failed", event.ts)
        break
      case "InventoryReserved":
        updateStatus(next, event.payload.orderId, "inventory_reserved", event.ts)
        break
      case "InventoryRejected":
        updateStatus(next, event.payload.orderId, "inventory_rejected", event.ts)
        break
      case "OrderConfirmed":
        updateStatus(next, event.payload.orderId, "confirmed", event.ts)
        break
      case "OrderCancelled":
        updateStatus(next, event.payload.orderId, "cancelled", event.ts)
        break
      case "OrderShipped":
        updateStatus(next, event.payload.orderId, "shipped", event.ts)
        break
      case "OrderDelivered":
        updateStatus(next, event.payload.orderId, "delivered", event.ts)
        break
    }
    return next
  },
}

function updateStatus(
  state: Map<string, OrderStatusEntry>,
  orderId: string,
  status: OrderStatus,
  ts: number,
): void {
  const prev = state.get(orderId)
  if (!prev) return // an event for an unknown order is ignored by this projection
  state.set(orderId, { ...prev, status, updatedAt: ts })
}

// ── Projection B: shipment_list — only shipped/delivered orders, for the warehouse. ─────────

export interface ShipmentEntry {
  orderId: string
  trackingId: string
  carrier: string
  delivered: boolean
  shippedAt: number
}
export type ShipmentListProjectionState = ReadonlyMap<string, ShipmentEntry>

export const shipmentListProjection: Projection<ShipmentListProjectionState, OrderEvent> = {
  name: "shipment_list",
  init: () => new Map<string, ShipmentEntry>(),
  fold(state, event) {
    const next = new Map(state)
    if (event.type === "OrderShipped") {
      const { orderId, trackingId, carrier } = event.payload
      next.set(orderId, { orderId, trackingId, carrier, delivered: false, shippedAt: event.ts })
    } else if (event.type === "OrderDelivered") {
      const prev = next.get(event.payload.orderId)
      if (prev) next.set(prev.orderId, { ...prev, delivered: true })
    }
    return next
  },
}
