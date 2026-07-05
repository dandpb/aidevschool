import { describe, expect, it } from "vitest"
import { anchorsOf, assign, GameController, ownerOf, ringHash } from "."

describe("threejs-dojo module entry", () => {
  it("exposes the headless hash-ring controller and sim helpers", () => {
    const game = new GameController("L1")
    const stations = [
      { id: "st-a", vnodes: 1 },
      { id: "st-b", vnodes: 1 },
    ]

    const owner = ownerOf(ringHash("key-a"), anchorsOf(stations))

    expect(game.snapshot.level.id).toBe("L1")
    expect(assign(["key-a"], stations).get("key-a")).toBe(owner)
  })
})
