import { describe, expect, it } from "vitest"
import { append, GameController, type OrderEvent, orderStatusProjection, project } from "."

describe("threejs-dojo module entry", () => {
  it("exposes the headless timeline-tower controller and sim helpers", () => {
    const game = new GameController("L1")
    expect(game.snapshot.level.id).toBe("L1")

    const created: OrderEvent = {
      type: "OrderCreated",
      ts: 1,
      streamId: "ord-1",
      payload: { orderId: "ord-1", customerId: "cust-1", totalCents: 100 },
    }
    const log = append<OrderEvent>([], created)
    const status = project(log, orderStatusProjection)
    expect(status.get("ord-1")?.status).toBe("pending")
  })
})
