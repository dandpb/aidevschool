export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same token stream ⇒ replayable waves. */
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
 * Deterministically pick one of `options` from an RNG draw. Used to script a
 * reproducible request stream (which requests are forged, which pass) per level.
 */
export function pick<T>(rng: Rng, options: readonly T[]): T {
  if (options.length === 0) throw new Error("empty options")
  return options[Math.floor(rng() * options.length)] as T
}
