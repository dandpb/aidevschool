export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

/**
 * Deterministically pick one of `options` from an RNG draw. Used to script a
 * reproducible request stream (which requests are forged, which pass) per level.
 */
export function pick<T>(rng: Rng, options: readonly T[]): T {
  if (options.length === 0) throw new Error("empty options")
  return options[Math.floor(rng() * options.length)] as T
}
