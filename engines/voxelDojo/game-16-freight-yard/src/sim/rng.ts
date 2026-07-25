export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

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
