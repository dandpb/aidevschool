export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

/**
 * Deterministic integer in [0, n). Used to script waves (pick a stale client,
 * choose a broadcast channel, etc.) from a seeded RNG so waves replay bit-for-bit.
 */
export function pickIndex(rng: Rng, n: number): number {
  return Math.floor(rng() * n)
}
