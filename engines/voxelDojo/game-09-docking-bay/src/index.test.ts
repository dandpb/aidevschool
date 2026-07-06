import { describe, expect, it } from "vitest"
import { dock, GameController, HOST_CONTRACT, type Host } from "."

describe("dockingBay module entry", () => {
  it("exposes the headless controller and sim helpers", () => {
    const game = new GameController("L1")
    expect(game.snapshot.level.id).toBe("L1")

    const host: Host = {
      id: "host",
      contract: HOST_CONTRACT,
      impls: {},
      docked: new Map(),
    }
    const res = dock(host, {
      id: "p",
      claimsContract: HOST_CONTRACT,
      capabilities: ["readState"],
    })
    expect(res.docked).toBe(true)
    expect(res.sandboxCap).toEqual(["readState"])
  })
})
