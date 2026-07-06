// Timeline Tower — core event-sourcing logic (pure, no three.js, no DOM).
//
// The ONE concept this module teaches: an order's authoritative state is the
// fold of an immutable, append-only event log. Every state change is an
// `OrderEvent` appended at sequence = top + 1; the tower refuses invalid
// transitions; a projection sphere reads a derived read-model that lags behind
// the log; replay rebuilds the projection by re-folding from sequence 1.
//
// This file is intentionally framework-free so the Vitest unit test can drive
// the state machine and the projection/replay invariants directly.

// Per-aggregate event kinds, in strict per-order sequence. The numeric codes
// are also the colour key the renderer uses for the tower floors.
export const ORDER_EVENT_KINDS = [
  "OrderCreated",
  "PaymentAuthorized",
  "InventoryReserved",
  "OrderConfirmed",
  "OrderShipped",
  "OrderDelivered",
] as const

export type OrderEventKind = (typeof ORDER_EVENT_KINDS)[number]

export type OrderEvent = {
  readonly seq: number // per-order sequence, 1-based
  readonly kind: OrderEventKind
  readonly ts: number // epoch millis
}

// The order states the fold can land in. Anything else (e.g. "pending")
// exists only as the absence of events.
export type OrderStatus =
  | "empty"
  | "created"
  | "payment_authorized"
  | "inventory_reserved"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"

// Folded (projected) order state — derived ONLY from events.
export type OrderState = {
  readonly status: OrderStatus
  readonly lastSeq: number
}

export const EMPTY_ORDER_STATE: OrderState = { status: "empty", lastSeq: 0 }

// Apply a single event to a folded state. Pure: returns a new state, never
// mutates. This is the function the projection sphere runs every time a
// beam lands, and the function replay runs from seq=1.
export function applyEvent(state: OrderState, event: OrderEvent): OrderState {
  switch (event.kind) {
    case "OrderCreated":
      return { status: "created", lastSeq: event.seq }
    case "PaymentAuthorized":
      return {
        status: state.status === "created" ? "payment_authorized" : state.status,
        lastSeq: event.seq,
      }
    case "InventoryReserved":
      return {
        status: state.status === "payment_authorized" ? "inventory_reserved" : state.status,
        lastSeq: event.seq,
      }
    case "OrderConfirmed":
      return {
        status: state.status === "inventory_reserved" ? "confirmed" : state.status,
        lastSeq: event.seq,
      }
    case "OrderShipped":
      return { status: state.status === "confirmed" ? "shipped" : state.status, lastSeq: event.seq }
    case "OrderDelivered":
      return { status: state.status === "shipped" ? "delivered" : state.status, lastSeq: event.seq }
  }
}

// Fold a whole event stream into a state. This is what replay does to rebuild
// a projection from the log: same events in, same state out.
export function foldEvents(events: readonly OrderEvent[]): OrderState {
  return events.reduce<OrderState>(applyEvent, EMPTY_ORDER_STATE)
}

// The kind of event that would be valid to append next, given the current
// state. Returns `null` when the order is terminal (delivered/cancelled) and
// a fresh order should be started. The renderer renders this as the "next
// floor" hint at the tower top.
export function nextValidKind(state: OrderState): OrderEventKind | null {
  switch (state.status) {
    case "empty":
      return "OrderCreated"
    case "created":
      return "PaymentAuthorized"
    case "payment_authorized":
      return "InventoryReserved"
    case "inventory_reserved":
      return "OrderConfirmed"
    case "confirmed":
      return "OrderShipped"
    case "shipped":
      return "OrderDelivered"
    case "delivered":
    case "cancelled":
      return null
  }
}

// Decide whether appending `kind` at sequence `seq` is legal against the
// current state. This is the aggregate's command-validation guard — the
// thing the X key tries to break.
export type AppendDecision =
  | { readonly ok: true; readonly event: OrderEvent }
  | { readonly ok: false; readonly reason: "out_of_order" | "wrong_kind" | "terminal" }

export function validateAppend(
  state: OrderState,
  kind: OrderEventKind,
  seq: number,
): AppendDecision {
  const expected = nextValidKind(state)
  if (expected === null) {
    return { ok: false, reason: "terminal" }
  }
  if (kind !== expected) {
    return { ok: false, reason: "wrong_kind" }
  }
  if (seq !== state.lastSeq + 1) {
    return { ok: false, reason: "out_of_order" }
  }
  return { ok: true, event: { seq, kind, ts: Date.now() } }
}

// Pick an event kind that would be invalid against `state` — used by the X
// key's negative test. Always returns something the tower will reject, so the
// rejection counter is guaranteed to advance when the player presses X.
//
// Subtle: when `state` is terminal (delivered/cancelled), the next append
// auto-advances to a fresh empty order where OrderCreated IS valid. So we
// reason about the post-auto-advance state to keep the "always rejected"
// contract honest.
export function pickInvalidKind(state: OrderState): OrderEventKind {
  const effective = nextValidKind(state) === null ? EMPTY_ORDER_STATE : state
  const expected = nextValidKind(effective)
  for (const kind of ORDER_EVENT_KINDS) {
    if (kind !== expected) {
      return kind
    }
  }
  // unreachable: ORDER_EVENT_KINDS is non-empty and expected is at most one of them
  return "OrderDelivered"
}

// Projection sphere state — the read model. Lag is the heart of eventual
// consistency: `appliedSeq` lags behind the log's lastSeq, and the player
// can see the gap.
export type Projection = {
  readonly orderIndex: number
  readonly state: OrderState
}

export function freshProjection(orderIndex: number): Projection {
  return { orderIndex, state: EMPTY_ORDER_STATE }
}

// Apply one buffered event to the projection (called when a beam lands).
// Idempotent: a duplicate event at the same seq is a no-op (at-least-once
// delivery from the broker, deduped by the subscriber).
export function projectEvent(proj: Projection, event: OrderEvent): Projection {
  if (event.seq <= proj.state.lastSeq) {
    return proj // idempotent: duplicate token fizzles
  }
  if (event.seq !== proj.state.lastSeq + 1) {
    return proj // gap — wait for the missing seq (strict ordering on the read side)
  }
  return { orderIndex: proj.orderIndex, state: applyEvent(proj.state, event) }
}

// Replay: re-fold the entire log for an order from seq 1. Must return the
// same state as the live projection once all events have landed — that
// equality is the replay-consistency gate (`projection_desync_after_replay`).
export function replayProjection(events: readonly OrderEvent[]): OrderState {
  return foldEvents(events)
}

// Tower-side aggregate: holds the per-order log and the rolled-up metrics the
// evidence record reports. The whole gameplay runs through this object.
export type TowerMetrics = {
  orders_completed: number
  events_appended: number
  invalid_transitions_rejected: number
  invalid_transitions_accepted: number
  outbox_backlog_peak: number
  projection_lag_peak_events: number
  saga_compensations: number
  replay_performed: boolean
  projection_desync_after_replay: boolean
}

export type TowerLevelConfig = {
  readonly level: number
  readonly orders_target: number
  readonly outbox_overflow_threshold: number
  readonly replay_required: boolean
}

export const LEVEL_1: TowerLevelConfig = {
  level: 1,
  orders_target: 3,
  // L1 is permissive: a single order with the publisher off (6 events) must
  // fit without overflowing. Stricter thresholds are enforced on L3+.
  outbox_overflow_threshold: 8,
  replay_required: false,
}

export type PerOrderLog = {
  readonly events: readonly OrderEvent[]
  readonly state: OrderState
}

export type OrderTower = {
  readonly level: TowerLevelConfig
  readonly orders: readonly PerOrderLog[]
  readonly current: PerOrderLog
  readonly metrics: TowerMetrics
  readonly outbox_backlog: number
  readonly publisher_on: boolean
  readonly projection: Projection
  readonly failed: boolean
  readonly failure_reason: string | null
}

export function startOrder(tower: OrderTower): OrderTower {
  // Starting a new order means: previous order (if any) is committed to the
  // history; projection sphere is reset to track the new order.
  const orders = tower.current.events.length === 0 ? tower.orders : [...tower.orders, tower.current]
  return {
    ...tower,
    orders,
    current: { events: [], state: EMPTY_ORDER_STATE },
    projection: freshProjection(orders.length + 1),
  }
}

export type AppendOutcome =
  | { readonly ok: true; readonly tower: OrderTower }
  | { readonly ok: false; readonly tower: OrderTower; readonly reason: string }

// Try to append `kind` to the current order. On success the floor is added to
// the log AND a token is queued on the outbox. On failure the rejection
// counter advances and (if the transition was *accepted* despite being wrong)
// the level fails immediately.
export function appendKind(tower: OrderTower, kind: OrderEventKind, now: number): AppendOutcome {
  if (tower.failed) {
    return { ok: false, tower, reason: "level_failed" }
  }
  // Auto-advance to a fresh order if the current one is delivered/terminal.
  let working = tower
  if (nextValidKind(tower.current.state) === null && tower.current.events.length > 0) {
    working = startOrder(tower)
  }
  const seq = working.current.events.length + 1
  const decision = validateAppend(working.current.state, kind, seq)
  if (!decision.ok) {
    // Rejection: the state machine guarded the log. This is the proof the
    // tower is wired. We do NOT fail on rejection — we count it.
    const metrics: TowerMetrics = {
      ...working.metrics,
      invalid_transitions_rejected: working.metrics.invalid_transitions_rejected + 1,
    }
    return { ok: false, tower: { ...working, metrics }, reason: decision.reason }
  }

  const event = { ...decision.event, ts: now }
  const events = [...working.current.events, event]
  const state = applyEvent(working.current.state, event)
  const outbox_backlog = working.publisher_on ? 0 : working.outbox_backlog + 1
  const outbox_backlog_peak = Math.max(working.metrics.outbox_backlog_peak, outbox_backlog)

  // Publisher-on path: the token is immediately ferried to the projection,
  // so the sphere stays in sync (lag 0). Publisher-off path: token piles up,
  // sphere falls behind — visible lag.
  const projection = working.publisher_on
    ? projectEvent(working.projection, event)
    : working.projection

  const lag_now = events.length - projectionStateSeq(projection)
  const projection_lag_peak_events = Math.max(working.metrics.projection_lag_peak_events, lag_now)

  let orders_completed = working.metrics.orders_completed
  let saga_compensations = working.metrics.saga_compensations
  if (state.status === "delivered") {
    orders_completed += 1
  }
  if (state.status === "cancelled") {
    saga_compensations += 1
  }

  const metrics: TowerMetrics = {
    ...working.metrics,
    events_appended: working.metrics.events_appended + 1,
    invalid_transitions_accepted: 0, // never accept invalid
    outbox_backlog_peak,
    projection_lag_peak_events,
    orders_completed,
    saga_compensations,
  }

  const failed = outbox_backlog > working.level.outbox_overflow_threshold
  const failure_reason = failed ? "outbox_overflow" : working.failure_reason

  return {
    ok: true,
    tower: {
      ...working,
      current: { events, state },
      outbox_backlog,
      projection,
      metrics,
      failed,
      failure_reason,
    },
  }
}

function projectionStateSeq(projection: Projection): number {
  return projection.state.lastSeq
}

// Drain the outbox: when the publisher is toggled back on, all queued tokens
// are ferried to the projection in seq order. This is the catch-up that lets
// the sphere match the tower. Pure "drain the backlog now" — caller decides
// when (typically: immediately after toggling publisher back on).
export function drainOutbox(tower: OrderTower): OrderTower {
  if (tower.outbox_backlog === 0) {
    return tower
  }
  // Re-project the full current-order log from seq 1 — equivalent to draining
  // every queued token in order.
  const state = foldEvents(tower.current.events)
  const lag_now = tower.current.events.length - state.lastSeq
  const projection_lag_peak_events = Math.max(tower.metrics.projection_lag_peak_events, lag_now)
  return {
    ...tower,
    outbox_backlog: 0,
    projection: { orderIndex: tower.projection.orderIndex, state },
    metrics: { ...tower.metrics, projection_lag_peak_events },
  }
}

export function togglePublisher(tower: OrderTower): OrderTower {
  const publisher_on = !tower.publisher_on
  let next: OrderTower = { ...tower, publisher_on }
  if (publisher_on) {
    next = drainOutbox(next)
  }
  return next
}

// V key — query the projection sphere. Returns whether it currently matches
// the tower top. If it does (and other gates pass) the level clears.
export function queryProjection(tower: OrderTower): {
  readonly matches: boolean
  readonly lag: number
} {
  const towerSeq = tower.current.events.length
  const projSeq = tower.projection.state.lastSeq
  return { matches: towerSeq === projSeq, lag: towerSeq - projSeq }
}

// Q key — replay the log from seq 1 and check the rebuilt projection matches
// the live one. Sets replay_performed=true; if they diverge, the level fails.
export function performReplay(tower: OrderTower): OrderTower {
  const rebuilt = replayProjection(tower.current.events)
  const desync = !sameState(rebuilt, tower.projection.state)
  const metrics: TowerMetrics = {
    ...tower.metrics,
    replay_performed: true,
    projection_desync_after_replay: desync,
  }
  const failed = desync ? true : tower.failed
  const failure_reason = desync ? "replay_desync" : tower.failure_reason
  return { ...tower, metrics, failed, failure_reason }
}

function sameState(a: OrderState, b: OrderState): boolean {
  return a.status === b.status && a.lastSeq === b.lastSeq
}

// Level-clear evaluation. All gates must pass.
export type GateResult = {
  readonly name: string
  readonly passed: boolean
  readonly value: number
  readonly target: number
}

export type LevelEvaluation = {
  readonly passed: boolean
  readonly gates: readonly GateResult[]
}

export function evaluateLevel(tower: OrderTower, projectionMatches: boolean): LevelEvaluation {
  const m = tower.metrics
  const gates: GateResult[] = [
    {
      name: "orders_completed",
      passed: m.orders_completed >= tower.level.orders_target,
      value: m.orders_completed,
      target: tower.level.orders_target,
    },
    {
      name: "invalid_transitions_accepted_zero",
      passed: m.invalid_transitions_accepted === 0,
      value: m.invalid_transitions_accepted,
      target: 0,
    },
    {
      name: "invalid_transitions_rejected_at_least_one",
      passed: m.invalid_transitions_rejected >= 1,
      value: m.invalid_transitions_rejected,
      target: 1,
    },
    {
      name: "outbox_backlog_bounded",
      passed: m.outbox_backlog_peak <= tower.level.outbox_overflow_threshold,
      value: m.outbox_backlog_peak,
      target: tower.level.outbox_overflow_threshold,
    },
    {
      name: "projection_caught_up",
      passed: projectionMatches,
      value: projectionMatches ? 1 : 0,
      target: 1,
    },
  ]
  if (tower.level.replay_required) {
    gates.push({
      name: "replay_performed",
      passed: m.replay_performed && !m.projection_desync_after_replay,
      value: m.replay_performed ? 1 : 0,
      target: 1,
    })
  }
  return { passed: gates.every((g) => g.passed), gates }
}
