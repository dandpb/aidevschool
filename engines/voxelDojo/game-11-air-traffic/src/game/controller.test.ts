import { describe, expect, it, vi } from "vitest"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: perfect round-robin predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const pad = game.predictTruthPad()
      game.predictPad(pad)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U11-load-balancer",
      project: "11_load_balancer",
      scenario_id: "air-traffic-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: probing reveals the dead pad, avoiding it clears with zero errors", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    // before probing, the unhealthy pad is hidden
    expect(game.isRevealed("b-1")).toBe(false)
    game.fireProbe()
    expect(game.isRevealed("b-1")).toBe(true)
    expect(game.snapshot.backends.find((b) => b.id === "b-1")?.health).toBe("unhealthy")
    // predict only healthy pads (round-robin skips the dead one)
    while (game.snapshot.phase === "predicting") {
      game.predictPad(game.predictTruthPad())
    }
    expect(game.snapshot.phase).toBe("cleared")
    expect(game.errors()).toBe(0)
    const record = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))[0]
    expect(record).toMatchObject({ scenario_id: "air-traffic-L2", pass: true })
    spy.mockRestore()
  })

  it("L2: routing to the dead pad (ignoring health) fails the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    game.fireProbe()
    // force every prediction onto the unhealthy pad
    while (game.snapshot.phase === "predicting") {
      game.predictPad("b-1")
    }
    expect(game.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L3: staying on round-robin fails; switching to least-connections clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    // first attempt: never switch policy → fail
    while (game.snapshot.phase === "predicting") {
      game.predictPad(game.predictTruthPad()) // truth under round-robin
    }
    expect(game.snapshot.phase).toBe("failed")

    // second attempt: switch to least-connections, predict the min-conn pad
    const game2 = new GameController("L3")
    game2.start()
    game2.setPolicy("least_connections")
    while (game2.snapshot.phase === "predicting") {
      game2.predictPad(game2.predictTruthPad())
    }
    expect(game2.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .filter((r: { scenario_id: string }) => r.scenario_id === "air-traffic-L3")
    // first L3 record is the failed round-robin attempt; the second is the cleared least-conn one
    expect(records[0]).toMatchObject({ pass: false, metrics: { policy: "round_robin" } })
    expect(records[1]).toMatchObject({ pass: true, metrics: { policy: "least_connections" } })
    spy.mockRestore()
  })

  it("L4: probing recovers the dead pad and it re-enters rotation", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const dead = game.snapshot.backends.find((b) => b.id === "b-2")
    expect(dead?.health).toBe("unhealthy")
    game.fireProbe()
    expect(game.snapshot.backends.find((b) => b.id === "b-2")?.health).toBe("healthy")
    // round-robin now includes b-2; predict truth for each ship
    while (game.snapshot.phase === "predicting") {
      game.predictPad(game.predictTruthPad())
    }
    expect(game.snapshot.phase).toBe("cleared")
    expect(game.snapshot.recoveredReentered).toBe(true)
    expect(game.errors()).toBe(0)
    const record = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))[0]
    expect(record).toMatchObject({ scenario_id: "air-traffic-L4", pass: true })
    spy.mockRestore()
  })

  it("L4: without probing, the pad never recovers so the wave fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    // never probe → recoveredReentered stays false
    while (game.snapshot.phase === "predicting") {
      game.predictPad(game.predictTruthPad())
    }
    expect(game.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })
})
