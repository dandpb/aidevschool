import { describe, expect, it, vi } from "vitest"
import { LIFECYCLE_ORDER } from "../sim/levels"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: appending the correct event order clears the wave and emits one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "playing") {
      game.appendNext(game.nextCorrectEventType())
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U8-event-driven",
      project: "08_event_driven_order_system",
      scenario_id: "timeline-tower-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L1: appending the wrong order the whole way fails but still emits evidence", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const wrong = LIFECYCLE_ORDER.find((t) => t !== game.nextCorrectEventType()) as string
    for (let i = 0; i < LIFECYCLE_ORDER.length; i++) game.appendNext(wrong as "OrderCreated")
    expect(game.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(1)
    spy.mockRestore()
  })

  it("L2: predicting the true final status clears; a wrong status fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    game.predictStatus(game.truthStatus())
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L2")
    game2.start()
    const truth = game2.truthStatus()
    const wrong = game2.statusChoices().find((s) => s !== truth) as string
    game2.predictStatus(wrong as "pending")
    expect(game2.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })

  it("L3: predicting both checkpoint and replay status correctly clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    game.predictAtCheckpoint(game.truthStatusAtCheckpoint())
    game.predictAfterReplay(game.truthStatus())
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })

  it("L4: predicting both views correctly clears; missing one keeps the wave open", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    game.pickOrderStatus(game.truthStatus())
    expect(game.snapshot.phase).toBe("playing") // need the second view too
    game.pickShipped(game.truthShipped())
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })

  it("nextLevel advances L1 → L2 → L3 → L4", () => {
    const game = new GameController("L1")
    expect(game.snapshot.level.id).toBe("L1")
    game.nextLevel()
    expect(game.snapshot.level.id).toBe("L2")
    game.nextLevel()
    expect(game.snapshot.level.id).toBe("L3")
    game.nextLevel()
    expect(game.snapshot.level.id).toBe("L4")
    game.nextLevel()
    expect(game.snapshot.level.id).toBe("L4") // no level past L4
  })
})
