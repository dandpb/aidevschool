export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same key stream ⇒ replayable attempts. */
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

/** Deterministic stream of key names. `skew` > 0 concentrates keys in a hot region (L4). */
export function keyStream(rng: Rng, count: number, skew = 0): string[] {
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    if (skew > 0 && rng() < skew) {
      keys.push(`hot:${Math.floor(rng() * 50)}`)
    } else {
      keys.push(`key:${Math.floor(rng() * 1e9).toString(36)}:${i}`)
    }
  }
  return keys
}
