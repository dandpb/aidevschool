/**
 * Deterministic per-building variation. The renderers ask for `{ wallColor,
 * roofColor, roofStyle, height, hasGarden, hasAwning }` keyed off the
 * building's `paletteSeed`. Same seed → same look across reloads, which keeps
 * the town feel consistent and the tests deterministic.
 */

/**
 * Mulberry32 — small, fast, well-distributed 32-bit PRNG. Good enough for
 * per-building visual jitter; not cryptographic. The state is closed over so
 * the returned function is the only mutable surface.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface BuildingVariation {
  readonly wallColor: string
  readonly roofColor: string
  readonly roofStyle: "pitched" | "flat"
  readonly height: 1 | 2 | 3
  readonly hasGarden: boolean
  readonly hasAwning: boolean
}

/** Pastel wall palette per docs/concepts/CONCEPTS.md. */
const WALL_PALETTE = [
  "#f3ead0", // cream
  "#f7e5b0", // soft yellow
  "#c8b89a", // warm grey
  "#d6c4a0", // sand
  "#bfa583", // tan
  "#e6d4b0", // pale straw
] as const

/** Saturated roof palette — terracotta, forest, navy, walnut. */
const ROOF_PALETTE = [
  "#c0524a", // terracotta
  "#5e7d5a", // forest green
  "#3d6a8a", // navy blue
  "#8a5a3b", // walnut
  "#a07b50", // bronze
  "#7a3f3a", // brick
] as const

function pick<T>(rng: () => number, palette: readonly T[]): T {
  const idx = Math.min(palette.length - 1, Math.floor(rng() * palette.length))
  const v = palette[idx]
  if (v === undefined) throw new Error("variation: empty palette")
  return v
}

function pickInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * Given a building's `paletteSeed` (an integer), return its visual identity.
 * The order of `rng()` calls is fixed: changing it will reshuffle every
 * building's look, but the same seed always returns the same result.
 */
export function buildingVariation(seed: number): BuildingVariation {
  const rng = mulberry32(seed)
  return {
    wallColor: pick(rng, WALL_PALETTE),
    roofColor: pick(rng, ROOF_PALETTE),
    roofStyle: rng() < 0.6 ? "pitched" : "flat",
    height: pickInt(rng, 1, 3) as 1 | 2 | 3,
    hasGarden: rng() < 0.35,
    hasAwning: rng() < 0.35,
  }
}

/**
 * Re-roll until `current` differs from `neighbor` on at least one cosmetic
 * field. Called by the scene layer when two adjacent buildings would otherwise
 * look identical (which makes the block feel like a single texture).
 */
export function buildingVariationDifferentFrom(
  seed: number,
  neighbor: BuildingVariation | null,
): BuildingVariation {
  if (!neighbor) return buildingVariation(seed)
  for (let attempt = 0; attempt < 6; attempt++) {
    const v = buildingVariation(seed + attempt * 7919)
    if (
      v.wallColor !== neighbor.wallColor ||
      v.roofColor !== neighbor.roofColor ||
      v.roofStyle !== neighbor.roofStyle ||
      v.height !== neighbor.height
    ) {
      return v
    }
  }
  // Accept the collision after 6 attempts — the palette is small enough that
  // a perfect guarantee isn't worth the loops.
  return buildingVariation(seed)
}
