import { describe, expect, it, vi } from "vitest"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: inject threshold failures + predict OPEN clears the wave and emits one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const id = game.snapshot.selectedDistrictId ?? "payments"
    const threshold = game.snapshot.level.failureThreshold
    for (let i = 0; i < threshold; i++) game.injectFailure(id)
    // the live district should now be OPEN
    const live = game.snapshot.districts.find((d) => d.id === id)
    expect(live?.breaker.state).toBe("open")
    game.toPredicting()
    game.predictTripState("open", id)
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U13-circuit-breaker",
      project: "13_api_gateway_circuit_breaker",
      scenario_id: "breaker-grid-L1",
      game: "BREAKER GRID",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: trip + cooldown + predict probe-success (→ CLOSED) clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    const id = game.snapshot.selectedDistrictId ?? "payments"
    for (let i = 0; i < game.snapshot.level.failureThreshold; i++) game.injectFailure(id)
    game.advanceClock(game.snapshot.level.cooldownMs + 1)
    const half = game.snapshot.districts.find((d) => d.id === id)
    expect(half?.breaker.state).toBe("half_open")
    game.toPredicting()
    game.predictProbeOutcome("success", "closed")
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })

  it("L3: firing a burst and predicting the cap-overflow rejections clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const cap = game.snapshot.level.cap
    const count = cap + 3
    game.toPredicting()
    game.predictBulkheadRejection(count, count - cap)
    expect(game.snapshot.phase).toBe("cleared")
    expect(game.snapshot.lastOutcome?.metrics.actual_rejected).toBe(count - cap)
    spy.mockRestore()
  })

  it("L4: cascade — predicting all other districts keep serving clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const failing = game.snapshot.selectedDistrictId ?? "payments"
    const others = game.snapshot.level.districtIds.filter((id) => id !== failing)
    game.toPredicting()
    game.predictCascade(others)
    expect(game.snapshot.phase).toBe("cleared")
    expect(game.snapshot.lastOutcome?.metrics.cascade_prevented).toBe(true)
    spy.mockRestore()
  })

  it("a wrong L1 prediction (predicting CLOSED after tripping) fails and still emits evidence", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const id = game.snapshot.selectedDistrictId ?? "payments"
    for (let i = 0; i < game.snapshot.level.failureThreshold; i++) game.injectFailure(id)
    game.toPredicting()
    game.predictTripState("closed", null) // wrong: it's open
    expect(game.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(1)
    spy.mockRestore()
  })
})
