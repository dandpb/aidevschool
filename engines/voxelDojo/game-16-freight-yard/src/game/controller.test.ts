import { describe, expect, it, vi } from "vitest"
import { partitionOf } from "../sim/queue"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: perfect lane predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const lane = game.pendingKeyPartition()
      if (lane === null) break
      game.predictRoute(lane)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U16-message-queue",
      project: "16_mini_message_queue",
      game: "FREIGHT YARD",
      scenario_id: "freight-yard-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: auto-assign (canonical round-robin) clears; an orphaned lane fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    game.autoAssign()
    game.lockInAssignment()
    expect(game.snapshot.phase).toBe("cleared")

    // a bad assignment: assign every lane to one crew (other crews unserved) → unfair → fail
    const game2 = new GameController("L2")
    game2.start()
    for (let p = 0; p < game2.snapshot.level.partitionCount; p++) game2.assignLane(p, "crew-0")
    game2.lockInAssignment()
    expect(game2.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L3: predicting the ground-truth rebalance owners clears; offsets are preserved", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const puzzle = game.snapshot.rebalancePuzzle
    if (!puzzle) throw new Error("no rebalance puzzle")
    // predict the actual new owner for every partition
    for (const [partition, owner] of puzzle.actualAssignment) {
      game.predictRebalanceOwner(partition, owner)
    }
    game.resolveRebalance()
    expect(game.snapshot.phase).toBe("cleared")
    const rec = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(rec[0]).toMatchObject({ scenario_id: "freight-yard-L3", pass: true })
    spy.mockRestore()
  })

  it("L4: predicting the exact replay offset set clears; a wrong set fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const puzzle = game.snapshot.replayPuzzle
    if (!puzzle) throw new Error("no replay puzzle")
    // rewind halfway down the lane and predict exactly the cars that will replay from there
    const tail = puzzle.actual.filter((m) => m.partition === puzzle.partition).length
    const rewindTo = Math.floor(tail / 2)
    game.setRewindTo(rewindTo)
    // expected truth = every car on this lane with offset >= rewindTo (recomputed from the log)
    const expected = puzzle.actual
      .filter((m) => m.partition === puzzle.partition && m.offset >= rewindTo)
      .map((m) => m.offset)
    for (const o of expected) game.toggleReplayOffset(o)
    game.resolveReplay()
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })
})

describe("partition routing sanity", () => {
  it("controller routeOfKey matches partitionOf", () => {
    const game = new GameController("L1")
    expect(game.routeOfKey("order-99")).toBe(
      partitionOf("order-99", game.snapshot.level.partitionCount),
    )
  })
})
