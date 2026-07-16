import { describe, expect, it, vi } from "vitest"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: perfect shelf predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const key = game.snapshot.keys[game.snapshot.pendingIndex]
      if (key === undefined) break
      game.predictShelf(game.shelfOfKey(key)) // ground-truth prediction
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U2-key-value-store",
      project: "02_key_value_store",
      scenario_id: "kv-warehouse-L1",
      game: "KV WAREHOUSE",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L1: wrong shelf predictions fail but still emit evidence", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const n = game.snapshot.store.shelfCount
    while (game.snapshot.phase === "predicting") {
      const key = game.snapshot.keys[game.snapshot.pendingIndex]
      if (key === undefined) break
      // deliberately wrong: always pick a shelf that is not the truth
      const truth = game.shelfOfKey(key)
      game.predictShelf((truth + 1) % n)
    }
    expect(game.snapshot.phase).toBe("failed")
    const rec = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "kv-warehouse-L1")
    expect(rec?.pass).toBe(false)
    spy.mockRestore()
  })

  it("L2: correct get-probes (alive vs missing) clear the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const key = game.snapshot.keys[game.snapshot.crudIndex]
      if (key === undefined) break
      game.answerGet(game.getTruth(key) !== null) // ground truth
    }
    expect(game.snapshot.phase).toBe("cleared")
    const rec = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "kv-warehouse-L2")
    expect(rec?.pass).toBe(true)
    spy.mockRestore()
  })

  it("L3: correct decay-probes + correct swept prediction clear the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    while (
      game.snapshot.phase === "predicting" &&
      game.snapshot.crudIndex < game.snapshot.keys.length
    ) {
      const key = game.snapshot.keys[game.snapshot.crudIndex]
      if (key === undefined) break
      game.answerGet(game.getTruth(key) !== null)
    }
    // all keys had the same TTL and the clock is past every deadline ⇒ all are expired
    game.predictSwept(game.snapshot.keys.length)
    expect(game.snapshot.phase).toBe("cleared")
    const rec = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "kv-warehouse-L3")
    expect(rec?.pass).toBe(true)
    spy.mockRestore()
  })

  it("L4: dialing hash strength up fixes the skew and lockIn clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    expect(game.currentSkew()).toBeGreaterThan(1.6)
    game.setHashStrength("full")
    expect(game.currentSkew()).toBeLessThanOrEqual(1.6)
    game.lockIn()
    expect(game.snapshot.phase).toBe("cleared")
    const rec = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "kv-warehouse-L4")
    expect(rec?.pass).toBe(true)
    spy.mockRestore()
  })
})
