export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

/** Deterministic stream of key names. `skew` > 0 concentrates keys in a hot region (L3). */
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
