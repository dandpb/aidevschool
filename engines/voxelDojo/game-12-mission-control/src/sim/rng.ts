export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same timeouts ⇒ replayable elections. */
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
 * Deterministically mix a base seed with a term so each election term draws a
 * fresh, reproducible stream. `seed ⊕ imul(term, golden)` keeps successive terms
 * uncorrelated while remaining a pure function of (seed, term).
 */
export function termSeed(baseSeed: number, term: number): number {
  return (baseSeed ^ Math.imul(term + 1, 0x9e3779b1)) >>> 0
}
