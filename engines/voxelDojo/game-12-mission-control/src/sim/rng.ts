export { mulberry32, type Rng } from "../../../shared/rng"

/**
 * Deterministically mix a base seed with a term so each election term draws a
 * fresh, reproducible stream. `seed ⊕ imul(term, golden)` keeps successive terms
 * uncorrelated while remaining a pure function of (seed, term).
 */
export function termSeed(baseSeed: number, term: number): number {
  return (baseSeed ^ Math.imul(term + 1, 0x9e3779b1)) >>> 0
}
