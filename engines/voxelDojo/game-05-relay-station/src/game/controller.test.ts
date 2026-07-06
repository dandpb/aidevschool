import { describe, expect, it, vi } from "vitest"
import { deliverySet, liveSet, survivorsAfterSweep } from "../sim/levels"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: predicting the exact live set clears the wave and emits one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const truth = liveSet(game.snapshot.level)
    for (const id of truth) game.togglePredict(id)
    game.lockIn()
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U5-websocket-chat",
      project: "05_websocket_chat",
      scenario_id: "relay-station-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: predicting the exact delivery set clears; an empty prediction fails — both emit", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    const truth = deliverySet(game.snapshot.level)
    expect(truth.length).toBeGreaterThan(0)
    for (const id of truth) game.togglePredict(id)
    game.lockIn()
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L2")
    game2.start()
    // empty prediction (nothing selected) — accuracy 0
    game2.lockIn()
    expect(game2.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })

  it("L3: predicting the survivor set clears the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const truth = survivorsAfterSweep(game.snapshot.level)
    expect(truth.length).toBeGreaterThan(0)
    for (const id of truth) game.togglePredict(id)
    game.lockIn()
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })

  it("L4: reconnecting the dropped client clears; reconnecting the wrong one fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const target = game.snapshot.level.recoverClientId
    expect(target).toBeTruthy()
    game.reconnect(target as string)
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L4")
    game2.start()
    // reconnect the wrong client
    const wrong = [...game2.snapshot.relay.clients.keys()].find((id) => id !== target) as string
    game2.reconnect(wrong)
    expect(game2.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })
})
