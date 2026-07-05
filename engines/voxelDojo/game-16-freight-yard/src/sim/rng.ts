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

/**
 * Deterministic stream of message keys. `hotKeyFrac` > 0 concentrates traffic on a few hot keys
 * (so multiple messages land in the same partition — the within-partition-order lesson).
 */
export function keyStream(rng: Rng, count: number, hotKeyFrac = 0): string[] {
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    if (hotKeyFrac > 0 && rng() < hotKeyFrac) {
      keys.push(`order:${Math.floor(rng() * 4)}`) // a handful of hot keys
    } else {
      keys.push(`evt:${Math.floor(rng() * 1e9).toString(36)}:${i}`)
    }
  }
  return keys
}
