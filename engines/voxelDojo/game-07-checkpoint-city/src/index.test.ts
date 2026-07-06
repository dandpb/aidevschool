import { describe, expect, it } from "vitest"
import { GameController, hmacSign, hmacVerify, runPipeline } from "."

describe("voxelDojo module entry (game-07-checkpoint-city)", () => {
  it("exposes the headless controller and the middleware/JWT sim helpers", () => {
    const game = new GameController("L1")
    const token = hmacSign({ sub: "alice" }, "k")
    const verified = hmacVerify(token, "k")

    expect(game.snapshot.level.id).toBe("L1")
    expect(verified).toBe(true)
    expect(runPipeline([], { id: "r", token }).reachedHandler).toBe(true)
  })
})
