export const RING_SIZE = 0x100000000 // 2^32

/** FNV-1a 32-bit. Raw FNV has weak avalanche on similar short strings (e.g. `st-0#1` vs `st-0#2`). */
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
 * Ring hash = fmix32(fnv1a(s)). Measured empirically (2026-07-05, 10k keys, 4→5 stations):
 * raw FNV anchors gave moved≈0.30 vs theoretical 0.20 and skew≈1.5; with the finalizer
 * moved≈0.20 and skew≈1.15. The finalizer is what makes the K/N lesson demonstrably true.
 */
export function ringHash(input: string): number {
  return fmix32(fnv1a(input))
}

/** Ring position in [0, 1) — angle fraction used by both sim and scene. */
export function ringPosition(hash: number): number {
  return hash / RING_SIZE
}
