export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same sample stream ⇒ replayable attempts. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

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
