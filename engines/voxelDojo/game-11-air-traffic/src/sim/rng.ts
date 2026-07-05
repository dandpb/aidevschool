export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same stream ⇒ replayable attempts. */
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
 * Deterministic stream of incoming request ids. `skew` > 0 concentrates connection lifetimes so
 * some pads stay busy longer (L3 least-connections lesson): when skew > 0, a fraction of requests
 * carry a long-lived connection that inflates the chosen pad's connection count.
 */
export function requestStream(rng: Rng, count: number, skew = 0): RequestSpec[] {
  const out: RequestSpec[] = []
  for (let i = 0; i < count; i++) {
    const longLived = skew > 0 && rng() < skew
    out.push({ id: `req-${i}`, cost: longLived ? 1 + Math.floor(rng() * 4) : 1 })
  }
  return out
}

export interface RequestSpec {
  id: string
  /** connection weight this request adds to its pad while active (least-connections input). */
  cost: number
}
