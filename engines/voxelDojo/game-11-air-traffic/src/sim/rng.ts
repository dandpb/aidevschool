export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

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
