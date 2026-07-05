import { describe, expect, it, vi } from "vitest"
import { ringHash } from "../sim/hash"
import { anchorsOf, ownerOf } from "../sim/ring"
import { CONTRAST_CORRECT, GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: perfect owner predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const key = game.snapshot.keys[game.snapshot.pendingKeyIndex]
      if (key === undefined) break
      game.predictOwner(ownerOf(ringHash(key), anchorsOf(game.snapshot.stations)))
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U9-distributed-cache",
      project: "10_distributed_cache",
      scenario_id: "hash-ring-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: predicting the actual loser clears; a wrong loser fails — both emit evidence", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    const loser = game.snapshot.actualLoserId
    expect(loser).toBeTruthy()
    game.predictLoser(loser as string)
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L2")
    game2.start()
    const wrong = game2.snapshot.stations.find((s) => s.id !== game2.snapshot.actualLoserId)
    game2.predictLoser((wrong as { id: string }).id)
    expect(game2.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })

  it("L3: dialing vnodes up fixes the skew and lockIn clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    expect(game.currentSkew()).toBeGreaterThan(1.6)
    game.setVnodes(64)
    expect(game.currentSkew()).toBeLessThanOrEqual(1.6)
    game.lockIn()
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })

  it("L4: correct contrast answers clear the modulo storm; wrong ones fail", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    game.answerContrast("consistent", CONTRAST_CORRECT.consistent)
    game.answerContrast("modulo", CONTRAST_CORRECT.modulo)
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L4")
    game2.start()
    game2.answerContrast("consistent", 0.8)
    game2.answerContrast("modulo", 0.2)
    expect(game2.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })
})
