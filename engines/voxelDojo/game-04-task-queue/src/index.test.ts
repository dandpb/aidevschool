import { describe, expect, it } from "vitest"
import { backpressure, dispatchOrder, GameController, makeTask, pickNext } from "."

describe("voxelDojo game-04 module entry", () => {
  it("exposes the headless task-forge controller and queue helpers", () => {
    const game = new GameController("L1")
    expect(game.snapshot.level.id).toBe("L1")
    expect(game.snapshot.queue.workers).toHaveLength(3)

    const tasks = [
      makeTask({ at: 0, label: "a", priority: 1, kind: "clear", idempotencyKey: "a" }, "t-a", 2),
      makeTask({ at: 1, label: "b", priority: 2, kind: "clear", idempotencyKey: "b" }, "t-b", 2),
    ]
    expect(pickNext(tasks, 5)?.id).toBe("t-b")
    expect(dispatchOrder(tasks, 5)).toHaveLength(2)
    expect(backpressure(5, 5)).toBe("full")
  })
})
