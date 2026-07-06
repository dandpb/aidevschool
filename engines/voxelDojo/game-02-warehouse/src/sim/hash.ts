export const HASH_SPACE = 0x100000000 // 2^32

/** FNV-1a 32-bit. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Murmur3 finalizer — full avalanche. */
function fmix32(h: number): number {
  let x = h
  x ^= x >>> 16
  x = Math.imul(x, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return x >>> 0
}

/**
 * Strength-controlled key hash. `strength` is how many characters of the key are folded by FNV
 * before the avalanche finalizer.
 *
 * - `strength = "full"` (default): fold every character ⇒ full avalanche ⇒ even spread ⇒ skew ≈ 1.
 * - small `strength` (e.g. 1–4): only a prefix is folded ⇒ many keys collide on the same bucket ⇒
 *   heavy load skew (the L4 lesson: a poor hash skews, and adding buckets does NOT help until the
 *   hash actually mixes more of the key).
 *
 * The same key at the same strength is always stable, so the hash→shelf prediction in L1 is
 * deterministic regardless of strength.
 */
export type HashStrength = number | "full"

export function hashKey(key: string, strength: HashStrength = "full"): number {
  const lim = strength === "full" ? key.length : Math.max(1, Math.min(strength, key.length))
  let h = 0x811c9dc5
  for (let i = 0; i < lim; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return fmix32(h) >>> 0
}

/** Shelf index in [0, n) for a key — the stable hash-addressed bucket. */
export function bucketOf(key: string, n: number, strength: HashStrength = "full"): number {
  if (n <= 0) throw new Error("shelf count must be > 0")
  return hashKey(key, strength) % n
}
