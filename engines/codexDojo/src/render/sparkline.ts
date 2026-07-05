// Pure sparkline path math for the AIDI trendline, extracted from
// render/learner.ts so the scaling edge cases are unit-testable. Values are
// expected in [0, 1] (max = 1); the path spans the 100x24 SVG viewBox used by
// the dashboard (`viewBox="0 0 100 24"`).

export const SPARKLINE_WIDTH = 100
export const SPARKLINE_HEIGHT = 24
const SPARKLINE_MAX_VALUE = 1

export type SparklinePoint = {
  readonly value: number
}

export function sparklinePath(points: ReadonlyArray<SparklinePoint>): string {
  if (points.length === 0) return ""
  const stepX = points.length === 1 ? SPARKLINE_WIDTH : SPARKLINE_WIDTH / (points.length - 1)
  return points
    .map((point, index) => {
      const x = index * stepX
      const y = (1 - point.value / SPARKLINE_MAX_VALUE) * SPARKLINE_HEIGHT
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}
