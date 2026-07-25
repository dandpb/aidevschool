export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

/**
 * Deterministic stream of metric sample values in [0, 1). `skew` > 0 inflates the right tail
 * (concentrates mass near 1.0) so L2/L3/L4 have a visible ridge to read a percentile off.
 * A uniform stream (skew = 0) is the L1 baseline: flat terrain, predictable bucketing.
 */
export function sampleStream(rng: Rng, count: number, skew = 0): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const u = rng()
    if (skew > 0) {
      // power curve: v = u^(1/(1+skew)) pushes mass rightward as skew grows; a fat tail.
      out.push(u ** (1 / (1 + skew * 2)))
    } else {
      out.push(u)
    }
  }
  return out
}
