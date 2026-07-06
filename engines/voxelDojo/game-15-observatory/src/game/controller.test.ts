import { describe, expect, it, vi } from "vitest"
import { bucketIndex } from "../sim/histogram"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: perfect bucket predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const value = game.pendingSampleValue()
      if (Number.isNaN(value)) break
      game.predictBucket(bucketIndex(game.snapshot.histogram, value))
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U15-metrics-collector",
      project: "15_metrics_collector",
      scenario_id: "observatory-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: predicting the correct p95 bucket clears; a wrong bucket fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    const h = game.snapshot.histogram
    const p = game.watchedPercentile()
    // find the bucket the percentile lands in
    let actual = 0
    for (let i = 0; i < h.boundaries.length; i++) {
      if (p <= (h.boundaries[i] as number)) {
        actual = i
        break
      }
      actual = h.boundaries.length - 1
    }
    game.predictPercentileBucket(actual)
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L2")
    game2.start()
    const wrong = actual === 0 ? 1 : 0
    game2.predictPercentileBucket(wrong)
    expect(game2.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })

  it("L3: setting the target SLO and predicting the true firing state clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const target = game.snapshot.level.slo
    if (target === null) throw new Error("L3 needs an SLO")
    game.setSloValue(target)
    const fires = game.watchedPercentile() > target
    game.predictFiring(fires)
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L3")
    game2.start()
    game2.setSloValue(target)
    game2.predictFiring(!fires) // wrong prediction
    expect(game2.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L4: picking the alerting (fat-tail) distribution clears; picking the tight one fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const alerting = game.alertingDistributionId()
    expect(alerting).not.toBeNull()
    game.pickDistribution(alerting as string)
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L4")
    game2.start()
    const silent = game2.snapshot.distributions.find((d) => d.id !== alerting)
    game2.pickDistribution((silent as { id: string }).id)
    expect(game2.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })
})
