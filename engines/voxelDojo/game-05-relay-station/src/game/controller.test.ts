import { describe, expect, it, vi } from "vitest"
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
    const truth = game.truthConnected()
    for (const id of truth) game.togglePredict(id)
    game.submit()
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U5-websocket-chat",
      project: "05_websocket_chat",
      scenario_id: "relay-station-L1",
      pass: true,
      metrics: { kind: "voxeldoj-relay-station" },
      observations: { kind: "relay-L1", predictions: truth },
    })
    spy.mockRestore()
  })

  it("L2: predicting the exact delivery set clears; an empty prediction fails — both emit", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    const truth = game.truthDelivery()
    expect(truth.length).toBeGreaterThan(0)
    for (const id of truth) game.togglePredict(id)
    game.submit()
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L2")
    game2.start()
    // empty prediction (nothing selected) — accuracy 0
    game2.submit()
    expect(game2.snapshot.phase).toBe("failed")
    const records = evidenceLines(spy).map((line) => JSON.parse(line.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(2)
    expect(records[0].observations).toEqual({ kind: "relay-L2", predictions: truth })
    expect(records[1].observations).toEqual({ kind: "relay-L2", predictions: [] })
    expect(records.every((record) => record.metrics.kind === "voxeldoj-relay-station")).toBe(true)
    spy.mockRestore()
  })

  it("L3: predicting the survivor set clears the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const truth = game.truthSurvivors()
    expect(truth.length).toBeGreaterThan(0)
    for (const id of truth) game.togglePredict(id)
    game.submit()
    expect(game.snapshot.phase).toBe("cleared")
    const record = evidenceLines(spy).map((line) => JSON.parse(line.slice("EVIDENCE ".length)))[0]
    expect(record.observations).toEqual({ kind: "relay-L3", predictions: truth })
    expect(record.metrics.kind).toBe("voxeldoj-relay-station")
    spy.mockRestore()
  })

  it("L4: reconnecting the dropped client clears; reconnecting the wrong one fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const target = game.truthReconnectTarget()
    expect(target).toBeTruthy()
    game.reconnect(target as string)
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L4")
    game2.start()
    // reconnect the wrong client
    const wrong = [...game2.snapshot.state.clients.keys()].find((id) => id !== target) as string
    game2.reconnect(wrong)
    expect(game2.snapshot.phase).toBe("failed")
    const records = evidenceLines(spy).map((line) => JSON.parse(line.slice("EVIDENCE ".length)))
    expect(records[0].observations).toEqual({ kind: "relay-L4", reconnectedId: target })
    expect(records[1].observations).toEqual({ kind: "relay-L4", reconnectedId: wrong })
    expect(records.every((record) => record.metrics.kind === "voxeldoj-relay-station")).toBe(true)
    spy.mockRestore()
  })
})
