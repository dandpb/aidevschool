export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same scenario stream ⇒ replayable attempts. */
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
 * Deterministic scenario generator: produces upload job parameters (file size, capacity, chunk size)
 * from a seeded RNG so the same level is replayable. The upload math itself is pure of the RNG —
 * only the *scenario* varies. `lo`/`hi` clamp the range; `skew` > 0 biases toward the high end
 * (bigger files that stress the buffer).
 */
export function intInRange(rng: Rng, lo: number, hi: number): number {
  const span = Math.max(0, hi - lo)
  return lo + Math.floor(rng() * (span + 1))
}
