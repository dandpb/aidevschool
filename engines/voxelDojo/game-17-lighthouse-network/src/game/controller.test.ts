import { describe, expect, it, vi } from "vitest"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

/** Drive a level to a passing state through the public API, then resolve. */
function playL1(game: GameController): void {
  game.start()
  game.setPredictedQuorum(game.quorumRequired()) // 3 for cluster of 5
  // ack the first 3 nodes from the deterministic order → reaches quorum
  for (const id of game.snapshot.ackOrder.slice(0, 3)) game.ackNode(id)
  game.resolve()
}

function playL2(game: GameController): void {
  game.start()
  // watchers subscribed to "heading": lh-0, lh-1 (lh-2 watches "colour")
  game.togglePredictedWatcher("lh-0")
  game.togglePredictedWatcher("lh-1")
  for (const id of game.snapshot.ackOrder.slice(0, 3)) game.ackNode(id)
  game.resolve()
}

function playL3(game: GameController): void {
  game.start()
  // partition side ["lh-0","lh-1"] = 2 nodes (minority); right = 3 (majority)
  game.setPredictedSide("right")
  game.resolve()
}

function playL4(game: GameController): void {
  game.start()
  // stale node = lh-0 (the partition side); sync it
  game.toggleSynced("lh-0")
  game.resolve()
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: predicting the right quorum and reaching it clears the wave (passing evidence)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    playL1(game)
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U17-config-service",
      project: "17_distributed_config_service",
      scenario_id: "lighthouse-network-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L1: a wrong quorum prediction fails (still emits evidence)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    game.setPredictedQuorum(2) // wrong — quorum is 3 for 5 nodes
    for (const id of game.snapshot.ackOrder.slice(0, 3)) game.ackNode(id)
    game.resolve()
    expect(game.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L2: predicting the correct lit watchers clears; a wrong set fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const good = new GameController("L2")
    playL2(good)
    expect(good.snapshot.phase).toBe("cleared")

    const bad = new GameController("L2")
    bad.start()
    bad.togglePredictedWatcher("lh-2") // wrong — lh-2 watches "colour", not "heading"
    for (const id of bad.snapshot.ackOrder.slice(0, 3)) bad.ackNode(id)
    bad.resolve()
    expect(bad.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })

  it("L3: predicting the majority (right) side clears; predicting the minority fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const good = new GameController("L3")
    playL3(good)
    expect(good.snapshot.phase).toBe("cleared")

    const bad = new GameController("L3")
    bad.start()
    bad.setPredictedSide("left") // minority — cannot commit
    bad.resolve()
    expect(bad.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L4: syncing the stale node clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    playL4(game)
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })
})
