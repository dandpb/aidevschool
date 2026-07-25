export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

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
