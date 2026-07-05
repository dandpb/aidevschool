import { describe, expect, it } from "vitest"
import {
  append,
  appendAll,
  checkpointIndex,
  fold,
  isStrictlyOrdered,
  length,
  type OrderEvent,
  type OrderStatusProjectionState,
  orderStatusProjection,
  project,
  replay,
  type ShipmentListProjectionState,
  shipmentListProjection,
  stableSortByTs,
} from "./sourcing"

// A small, deterministic order-lifecycle log used across the proofs.
// ts is strictly increasing so the log is well-ordered (RNF-001).
function sampleLog(): OrderEvent[] {
  return [
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
}

describe("concept proof 1 — determinism: same log ⇒ same projection on every replay", () => {
  it("replays the log to identical read-model state every time", () => {
    const log = sampleLog()
    const a = project(log, orderStatusProjection)
    const b = project(log, orderStatusProjection)
    const c = replay(log, orderStatusProjection, 0)
    expect([...a.entries()]).toEqual([...b.entries()])
    expect([...a.entries()]).toEqual([...c.entries()])
  })

  it("the rebuilt read-model reflects the full lifecycle (RF-004: state = replay of events)", () => {
    const entry = project(sampleLog(), orderStatusProjection).get("ord-1")
    expect(entry?.status).toBe("delivered")
    expect(entry?.customerId).toBe("cust-1")
    expect(entry?.totalCents).toBe(1299)
  })

  it("replay from a checkpoint rebuilds the same state as a full replay", () => {
    const log = sampleLog()
    const full = project(log, orderStatusProjection)
    // checkpoint = the read-model built by folding the first 3 events only
    const checkpoint = replay(log.slice(0, 3), orderStatusProjection, 0)
    expect(checkpoint.get("ord-1")?.status).toBe("inventory_reserved")
    // continue replaying from the checkpoint onward (fold events [3..] onto the checkpoint state)
    const continued = replay(log, orderStatusProjection, 3, checkpoint)
    expect(continued.get("ord-1")?.status).toBe("delivered")
    // a full replay from the start produces the same derived state — replay is deterministic
    expect([...continued.entries()]).toEqual([...full.entries()])
  })
})

describe("concept proof 2 — immutability: appending never mutates prior projections or the log", () => {
  it("append returns a NEW log; the original log array is untouched", () => {
    const log = sampleLog()
    const frozenLength = log.length
    const snapshot = [...log]
    const more = append(log, {
      type: "OrderCancelled",
      ts: 7,
      streamId: "ord-2",
      payload: { orderId: "ord-2" },
    })
    expect(log.length).toBe(frozenLength) // original unchanged
    expect(log).toEqual(snapshot)
    expect(more.length).toBe(frozenLength + 1)
    expect(more[more.length - 1]?.type).toBe("OrderCancelled")
  })

  it("a projection built BEFORE an append is not retroactively changed by later appends", () => {
    const log = sampleLog()
    const before = project(log, orderStatusProjection)
    const beforeJson = JSON.stringify([...before.entries()])
    // grow the log with new events for a DIFFERENT order
    appendAll(log, [
      {
        type: "OrderCreated",
        ts: 7,
        streamId: "ord-9",
        payload: { orderId: "ord-9", customerId: "cust-9", totalCents: 500 },
      },
      { type: "PaymentFailed", ts: 8, streamId: "ord-9", payload: { orderId: "ord-9" } },
    ])
    // prior read-model is byte-for-byte identical — derived views are snapshots, not live refs
    expect(JSON.stringify([...before.entries()])).toBe(beforeJson)
  })

  it("folding one event returns a new state object, leaving the prior state untouched", () => {
    const init = orderStatusProjection.init()
    const e: OrderEvent = {
      type: "OrderCreated",
      ts: 1,
      streamId: "ord-1",
      payload: { orderId: "ord-1", customerId: "cust-1", totalCents: 100 },
    }
    const next = fold(orderStatusProjection, init, e)
    expect(init.size).toBe(0) // initial state untouched
    expect(next.size).toBe(1)
    expect(next).not.toBe(init)
  })
})

describe("concept proof 3 — two projections fold the SAME log DIFFERENTLY", () => {
  it("order_status and shipment_list derive different views from one log", () => {
    const log = sampleLog()
    const status = project(log, orderStatusProjection) as OrderStatusProjectionState
    const shipments = project(log, shipmentListProjection) as ShipmentListProjectionState

    // order_status sees every order, even ones that never shipped
    expect(status.size).toBe(1)
    expect(status.get("ord-1")?.status).toBe("delivered")

    // shipment_list only tracks shipped orders; a pending-only order is invisible to it
    const pendingOnly: OrderEvent[] = [
      {
        type: "OrderCreated",
        ts: 1,
        streamId: "ord-2",
        payload: { orderId: "ord-2", customerId: "cust-2", totalCents: 999 },
      },
    ]
    expect(project(pendingOnly, shipmentListProjection).size).toBe(0)
    expect(project(pendingOnly, orderStatusProjection).size).toBe(1)

    // and shipment_list carries fields order_status does not
    const ship = shipments.get("ord-1")
    expect(ship?.trackingId).toBe("trk-1")
    expect(ship?.delivered).toBe(true)
    expect((status.get("ord-1") as { trackingId?: string }).trackingId ?? null).toBe(null)
  })

  it("a payment failure moves status to payment_failed but adds nothing to shipment_list", () => {
    const log: OrderEvent[] = [
      {
        type: "OrderCreated",
        ts: 1,
        streamId: "ord-3",
        payload: { orderId: "ord-3", customerId: "cust-3", totalCents: 100 },
      },
      { type: "PaymentFailed", ts: 2, streamId: "ord-3", payload: { orderId: "ord-3" } },
    ]
    expect(project(log, orderStatusProjection).get("ord-3")?.status).toBe("payment_failed")
    expect(project(log, shipmentListProjection).size).toBe(0)
  })
})

describe("deterministic ordering & checkpoint helpers", () => {
  it("stableSortByTs orders by ts and preserves append order on ties", () => {
    const outOfOrder = [
      { type: "B", ts: 2, streamId: "s", payload: {} },
      { type: "A", ts: 1, streamId: "s", payload: {} },
      { type: "C", ts: 2, streamId: "s", payload: {} },
    ] as const
    const sorted = stableSortByTs(outOfOrder)
    expect(sorted.map((e) => e.type)).toEqual(["A", "B", "C"]) // B before C on the tie
  })

  it("isStrictlyOrdered detects monotonic ts", () => {
    expect(isStrictlyOrdered(sampleLog())).toBe(true)
    const bad = append(sampleLog(), {
      type: "OrderCancelled",
      ts: 3,
      streamId: "ord-9",
      payload: { orderId: "ord-9" },
    })
    expect(isStrictlyOrdered(bad)).toBe(false)
  })

  it("checkpointIndex finds the last event at or before the checkpoint ts", () => {
    const log = sampleLog()
    expect(checkpointIndex(log, 3)).toBe(2) // ts=3 is index 2
    expect(checkpointIndex(log, 0)).toBe(-1) // nothing yet
  })

  it("length reports the tower height", () => {
    expect(length(sampleLog())).toBe(6)
    expect(
      length(
        append(sampleLog(), {
          type: "OrderCancelled",
          ts: 7,
          streamId: "ord-9",
          payload: { orderId: "ord-9" },
        }),
      ),
    ).toBe(7)
  })
})
