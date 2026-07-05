import { describe, expect, it } from "vitest"
import { GameController, makeBackend, makeRouter, policyRoute } from "."

describe("voxeldojo module entry", () => {
  it("exposes the headless air-traffic controller and balancer helpers", () => {
    const game = new GameController("L1")
    const backends = [makeBackend("b-0"), makeBackend("b-1")]
    const pick = policyRoute("round_robin", { id: "req-0", cost: 1 }, backends, makeRouter())

    expect(game.snapshot.level.id).toBe("L1")
    expect(pick?.id).toBe("b-0")
  })
})
