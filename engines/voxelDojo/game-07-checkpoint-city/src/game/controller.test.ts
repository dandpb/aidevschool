import { describe, expect, it, vi } from "vitest"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: predicting 'reaches the handler' for every valid request clears the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const answer = game.pendingAnswer()
      if (answer === null) break
      game.predict(answer)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U7-rest-api-auth",
      project: "07_rest_api_auth",
      scenario_id: "checkpoint-city-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: predicting the ground-truth gate for each forged/valid request clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const answer = game.pendingAnswer()
      if (answer === null) break
      game.predict(answer)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const record = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "checkpoint-city-L2")
    expect(record?.pass).toBe(true)
    expect(record?.metrics.prediction_accuracy).toBe(1)
    spy.mockRestore()
  })

  it("L2: predicting 'reaches the handler' for everything (ignoring forged tokens) fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    while (game.snapshot.phase === "predicting") {
      game.predict("reaches-handler") // wrong for the forged ones
    }
    expect(game.snapshot.phase).toBe("failed")
    const record = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "checkpoint-city-L2")
    expect(record?.pass).toBe(false)
    spy.mockRestore()
  })

  it("L3: predicting the rate-limit boundary exactly clears the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const answer = game.pendingAnswer()
      if (answer === null) break
      game.predict(answer)
    }
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })

  it("L4: restoring the canonical order + correct probe prediction clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    // reorder given [rate-limit, logging, auth] → target [logging, auth, rate-limit]
    game.moveLayer(0, 2) // move rate-limit to the end → [logging, auth, rate-limit]
    expect([...game.snapshot.order]).toEqual(["logging", "auth", "rate-limit"])
    game.commitReorder("auth") // forged token under canonical order dies at auth
    expect(game.snapshot.phase).toBe("cleared")
    const record = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "checkpoint-city-L4")
    expect(record?.pass).toBe(true)
    expect(record?.metrics.reorder_correct).toBe(true)
    spy.mockRestore()
  })

  it("L4: leaving the scrambled order fails even with a lucky probe guess", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    // do not reorder — order stays as given [rate-limit, logging, auth]
    game.commitReorder("rate-limit")
    expect(game.snapshot.phase).toBe("failed")
    const record = evidenceLines(spy)
      .map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
      .find((r) => r.scenario_id === "checkpoint-city-L4")
    expect(record?.metrics.reorder_correct).toBe(false)
    spy.mockRestore()
  })
})
