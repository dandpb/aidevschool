import { describe, expect, it } from "vitest"
import {
  appendKind,
  drainOutbox,
  evaluateLevel,
  foldEvents,
  freshProjection,
  LEVEL_1,
  nextValidKind,
  ORDER_EVENT_KINDS,
  type OrderEvent,
  type OrderTower,
  performReplay,
  pickInvalidKind,
  queryProjection,
  startOrder,
  togglePublisher,
  validateAppend,
} from "./logic"

function newTower(): OrderTower {
  return startOrder({
    level: LEVEL_1,
    orders: [],
    current: { events: [], state: { status: "empty", lastSeq: 0 } },
    metrics: {
      orders_completed: 0,
      events_appended: 0,
      invalid_transitions_rejected: 0,
      invalid_transitions_accepted: 0,
      outbox_backlog_peak: 0,
      projection_lag_peak_events: 0,
      saga_compensations: 0,
      replay_performed: false,
      projection_desync_after_replay: false,
    },
    outbox_backlog: 0,
    publisher_on: true,
    projection: freshProjection(1),
    failed: false,
    failure_reason: null,
  })
}

function driveFullOrder(tower: OrderTower, base: number): OrderTower {
  let t = tower
  for (const kind of ORDER_EVENT_KINDS) {
    const r = appendKind(t, kind, base + t.current.events.length)
    expect(r.ok).toBe(true)
    if (r.ok) {
      t = r.tower
    }
  }
  return t
}

describe("event-sourced order lifecycle", () => {
  it("folds an empty event stream to the empty state", () => {
    expect(foldEvents([])).toEqual({ status: "empty", lastSeq: 0 })
  })

  it("appends each lifecycle event in strict sequence", () => {
    let tower = newTower()
    let expected: OrderEvent[] = []
    for (const kind of ORDER_EVENT_KINDS) {
      const r = appendKind(tower, kind, 100 + expected.length)
      expect(r.ok).toBe(true)
      if (r.ok) {
        tower = r.tower
        expected = [...expected, { seq: expected.length + 1, kind, ts: 100 + expected.length }]
        expect(tower.current.events).toHaveLength(expected.length)
        expect(tower.current.events.at(-1)?.kind).toBe(kind)
        expect(tower.current.events.at(-1)?.seq).toBe(expected.length)
      }
    }
    // After all six events the order is delivered.
    expect(tower.current.state.status).toBe("delivered")
    expect(tower.metrics.events_appended).toBe(ORDER_EVENT_KINDS.length)
    expect(tower.metrics.orders_completed).toBe(1)
  })

  it("rejects an out-of-order event and increments the rejection counter", () => {
    let tower = newTower()
    // Try to ship before even creating the order.
    const r = appendKind(tower, "OrderShipped", 1)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe("wrong_kind")
      tower = r.tower
    }
    expect(tower.metrics.invalid_transitions_rejected).toBe(1)
    expect(tower.metrics.invalid_transitions_accepted).toBe(0)
    expect(tower.current.events).toHaveLength(0)
  })

  it("never accepts an invalid transition (state machine is the source of truth)", () => {
    let tower = newTower()
    // Drive the whole lifecycle but try to inject invalid events at every step.
    for (const kind of ORDER_EVENT_KINDS) {
      const invalid = pickInvalidKind(tower.current.state)
      const bad = appendKind(tower, invalid, 1)
      expect(bad.ok).toBe(false)
      if (!bad.ok) {
        tower = bad.tower
      }
      const good = appendKind(tower, kind, 100 + tower.current.events.length)
      expect(good.ok).toBe(true)
      if (good.ok) {
        tower = good.tower
      }
    }
    expect(tower.metrics.invalid_transitions_accepted).toBe(0)
    expect(tower.metrics.invalid_transitions_rejected).toBe(ORDER_EVENT_KINDS.length)
    expect(tower.metrics.orders_completed).toBe(1)
  })

  it("keeps the projection in sync when the publisher is on", () => {
    let tower = newTower()
    tower = driveFullOrder(tower, 100)
    const q = queryProjection(tower)
    expect(q.matches).toBe(true)
    expect(q.lag).toBe(0)
  })

  it("lets the projection lag behind when the publisher is off, then catches up on drain", () => {
    let tower = newTower()
    tower = togglePublisher(tower) // publisher off
    expect(tower.publisher_on).toBe(false)
    // Append all six events; with publisher off, tokens pile up.
    for (const kind of ORDER_EVENT_KINDS) {
      const r = appendKind(tower, kind, 100 + tower.current.events.length)
      if (r.ok) {
        tower = r.tower
      }
    }
    expect(tower.metrics.events_appended).toBe(ORDER_EVENT_KINDS.length)
    const lagged = queryProjection(tower)
    expect(lagged.matches).toBe(false)
    expect(lagged.lag).toBe(ORDER_EVENT_KINDS.length)
    // Toggle publisher back on -> drain -> projection catches up.
    tower = togglePublisher(tower)
    expect(tower.publisher_on).toBe(true)
    expect(tower.outbox_backlog).toBe(0)
    const caught = queryProjection(tower)
    expect(caught.matches).toBe(true)
    expect(caught.lag).toBe(0)
  })

  it("replays the log and rebuilds a matching projection (desync=false)", () => {
    let tower = newTower()
    tower = driveFullOrder(tower, 100)
    expect(tower.projection.state.status).toBe("delivered")
    tower = performReplay(tower)
    expect(tower.metrics.replay_performed).toBe(true)
    expect(tower.metrics.projection_desync_after_replay).toBe(false)
    expect(tower.failed).toBe(false)
  })

  it("fails the level when the outbox overflows past the threshold", () => {
    // Use a stricter level config so we can drive an overflow without needing
    // more events than the lifecycle provides. L1 ships with threshold 8
    // (a full order with publisher off fits); L3+ enforces tighter bounds.
    const strictLevel: typeof LEVEL_1 = { ...LEVEL_1, outbox_overflow_threshold: 4 }
    let tower: OrderTower = { ...newTower(), level: strictLevel }
    tower = togglePublisher(tower) // publisher off
    // Overflow threshold for the strict level is 4; append enough events to exceed it.
    for (let i = 0; i < strictLevel.outbox_overflow_threshold + 1; i += 1) {
      const r = appendKind(tower, ORDER_EVENT_KINDS[i] ?? "OrderCreated", 100 + i)
      if (r.ok) {
        tower = r.tower
      }
    }
    expect(tower.failed).toBe(true)
    expect(tower.failure_reason).toBe("outbox_overflow")
  })

  it("clears level 1 when 3 orders complete, >=1 rejection, projection caught up", () => {
    let tower = newTower()
    // Drive 3 full orders. Each delivered order auto-advances to a fresh one.
    // Inject a rejected invalid transition mid-lifecycle on order 0 to prove
    // the state machine guards the log (not just appending blindly).
    for (let order = 0; order < LEVEL_1.orders_target; order += 1) {
      const oc = appendKind(tower, "OrderCreated", 1000 * order)
      if (oc.ok) {
        tower = oc.tower
      }
      if (order === 0) {
        // state=created here; pickInvalidKind returns a kind that is NOT the
        // next-valid (PaymentAuthorized) — the tower MUST reject it.
        const invalid = pickInvalidKind(tower.current.state)
        const bad = appendKind(tower, invalid, 1000 * order + 50)
        expect(bad.ok).toBe(false)
        if (!bad.ok) {
          tower = bad.tower
        }
      }
      // Continue the lifecycle from OrderCreated onward. Kinds that don't
      // match the next-valid are rejected (proving the guard again).
      for (const kind of ORDER_EVENT_KINDS) {
        const r = appendKind(tower, kind, 1000 * order + 100 + tower.current.events.length)
        if (r.ok) {
          tower = r.tower
        }
      }
    }
    expect(tower.metrics.invalid_transitions_rejected).toBeGreaterThanOrEqual(1)
    expect(tower.metrics.orders_completed).toBe(LEVEL_1.orders_target)
    // Final projection query.
    const q = queryProjection(tower)
    const eval_ = evaluateLevel(tower, q.matches)
    expect(eval_.passed).toBe(true)
    expect(tower.metrics.invalid_transitions_accepted).toBe(0)
  })

  it("validates sequence gaps on append", () => {
    const r = validateAppend({ status: "created", lastSeq: 1 }, "PaymentAuthorized", 5)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe("out_of_order")
    }
  })

  it("drainOutbox is a no-op when the backlog is empty", () => {
    const tower = newTower()
    const same = drainOutbox(tower)
    expect(same).toBe(tower)
  })

  it("nextValidKind returns null only on terminal states", () => {
    expect(nextValidKind({ status: "empty", lastSeq: 0 })).toBe("OrderCreated")
    expect(nextValidKind({ status: "created", lastSeq: 1 })).toBe("PaymentAuthorized")
    expect(nextValidKind({ status: "delivered", lastSeq: 6 })).toBeNull()
    expect(nextValidKind({ status: "cancelled", lastSeq: 6 })).toBeNull()
  })

  it("pickInvalidKind never returns the next valid kind", () => {
    const states = [
      { status: "empty", lastSeq: 0 },
      { status: "created", lastSeq: 1 },
      { status: "delivered", lastSeq: 6 },
    ] as const
    for (const s of states) {
      const valid = nextValidKind(s)
      const invalid = pickInvalidKind(s)
      expect(invalid).not.toBe(valid)
    }
  })
})
