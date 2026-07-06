import { describe, expect, it, vi } from "vitest"
import { detectCollision, hashTruncCode } from "../sim/shortener"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: perfect code predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const code = game.predictedCodeForPending()
      if (code === "") break
      game.predictCode(code)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U3-url-shortener",
      project: "03_url_shortener",
      scenario_id: "wormhole-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: perfect destination predictions clear the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const dest = game.currentRedirectDestination()
      if (dest === null) break
      game.predictDestination(dest)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records[0]).toMatchObject({ scenario_id: "wormhole-L2", pass: true })
    spy.mockRestore()
  })

  it("L3: correctly classifying every collision clears the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    while (game.snapshot.phase === "predicting") {
      // Use the ground-truth collision test to play perfectly.
      const url = game.currentCollisionUrl()
      if (url === null) break
      const actual = wouldCollideViaGame(game)
      game.predictCollision(actual)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records[0]).toMatchObject({ scenario_id: "wormhole-L3", pass: true })
    spy.mockRestore()
  })

  it("L4: picking 'salted' resolves the forced collision and clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    expect(game.snapshot.collisionCode).not.toBeNull()
    expect(game.colliderUrl()).not.toBeNull()
    game.pickResolution("salted")
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records[0]).toMatchObject({
      scenario_id: "wormhole-L4",
      pass: true,
      metrics: { resolution_chosen: "salted", resolved_unique: true },
    })
    spy.mockRestore()
  })

  it("L4: 'increment' also resolves the forced collision", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    game.pickResolution("increment")
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })
})

// The controller doesn't expose wouldCollide directly; mirror it via the map for a perfect L3 play.
function wouldCollideViaGame(game: GameController): boolean {
  const url = game.snapshot.urls[game.snapshot.pendingIndex]
  if (url === undefined) return false
  // Re-derive via the public hash on the live map: a collision iff the truncated code exists for a different url.
  return detectCollision(game.snapshot.map, hashTruncCode(url), url)
}
