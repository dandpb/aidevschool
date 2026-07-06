import { describe, expect, it } from "vitest"
import { bucketIndex, GameController, makeHistogram, percentile, record } from "."

describe("threejs-dojo module entry", () => {
  it("exposes the headless observatory controller and sim helpers", () => {
    const game = new GameController("L1")
    expect(game.snapshot.level.id).toBe("L1")

    const h = makeHistogram(8)
    record(h, 0.3)
    expect(bucketIndex(h, 0.3)).toBe(2)
    // one sample: every percentile resolves to a value inside its bucket
    expect(percentile(h, 50)).toBeGreaterThanOrEqual(0.25)
    expect(percentile(h, 50)).toBeLessThanOrEqual(0.5)
  })
})
