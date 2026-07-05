import { describe, expect, it } from "vitest"
import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, sparklinePath } from "./sparkline"

function points(...values: readonly number[]): ReadonlyArray<{ readonly value: number }> {
  return values.map((value) => ({ value }))
}

describe("sparklinePath", () => {
  it("returns an empty path for an empty series", () => {
    expect(sparklinePath([])).toBe("")
  })

  it("renders a single point as one moveto at the left edge", () => {
    expect(sparklinePath(points(0.5))).toBe("M 0.0 12.0")
  })

  it("renders an all-equal series as a flat line without divide-by-zero", () => {
    const path = sparklinePath(points(0.25, 0.25, 0.25))

    expect(path).toBe("M 0.0 18.0 L 50.0 18.0 L 100.0 18.0")
    expect(path).not.toContain("NaN")
    expect(path).not.toContain("Infinity")
  })

  it("maps value 1 to the top edge and value 0 to the bottom edge", () => {
    expect(sparklinePath(points(1, 0))).toBe(
      `M 0.0 0.0 L ${SPARKLINE_WIDTH}.0 ${SPARKLINE_HEIGHT}.0`,
    )
  })

  it("spreads x evenly from 0 to the full width for longer series", () => {
    const path = sparklinePath(points(0.5, 0.5, 0.5, 0.5, 0.5))
    const xs = path.split(" ").filter((_, index) => index % 3 === 1)

    expect(xs).toEqual(["0.0", "25.0", "50.0", "75.0", "100.0"])
  })

  it("keeps every coordinate inside the viewBox for in-range values", () => {
    const path = sparklinePath(points(0, 0.13, 0.42, 0.87, 1))
    const commands = path.split(/(?=[ML])/).map((segment) => segment.trim().split(" "))

    for (const [, x, y] of commands) {
      expect(Number(x)).toBeGreaterThanOrEqual(0)
      expect(Number(x)).toBeLessThanOrEqual(SPARKLINE_WIDTH)
      expect(Number(y)).toBeGreaterThanOrEqual(0)
      expect(Number(y)).toBeLessThanOrEqual(SPARKLINE_HEIGHT)
    }
  })

  it("maps out-of-range values past the edges without clamping", () => {
    expect(sparklinePath(points(-0.5))).toBe("M 0.0 36.0")
    expect(sparklinePath(points(1.5))).toBe("M 0.0 -12.0")
  })

  it("rounds coordinates to one decimal place", () => {
    expect(sparklinePath(points(1 / 3, 2 / 3))).toBe("M 0.0 16.0 L 100.0 8.0")
  })
})
