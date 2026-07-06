/**
 * Headless URL-shortener sim core. Pure TypeScript, ZERO three imports.
 *
 * The concept this teaches: short-code generation + collision handling.
 *  - toBase62 / fromBase62: bijective integer ↔ code
 *  - shorten(map, url, strategy) for hash_trunc | counter | salted
 *  - detectCollision: does a code already exist in the map?
 *  - resolveCollision: salted re-hash, or increment until unique
 *  - redirect(map, code): where does this code send you?
 *
 * Determinism: the underlying hash is fnv1a + fmix32 (full avalanche), truncated to N base62
 * chars. Truncation is *why* hash_trunc collides on purpose — that is the lesson. The `counter`
 * strategy is monotonic and never collides. The `salted` strategy re-hashes with a per-attempt
 * salt until the code is free.
 */

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
// 4 base62 chars → ~14.7M codes. Deliberately small enough that truncated-hash collisions are
// *demonstrable* (birthday bound ≈ 4.5k URLs) — that is the lesson: short codes collide.
export const CODE_LEN = 4

export type Strategy = "hash_trunc" | "counter" | "salted"

/** A shortener map entry: code → destination URL (with the strategy that produced it). */
export interface ShortEntry {
  url: string
  strategy: Strategy
}

/** Mutable shortener map. The controller owns one per wave; the sim functions transform it. */
export type ShortMap = Map<string, ShortEntry>

/** Outcome of a shorten attempt. A collision is reported, not silently overwritten. */
export interface ShortenResult {
  code: string
  url: string
  strategy: Strategy
  collision: boolean
}

export interface RedirectResult {
  url: string | null
  found: boolean
}

// ── base62 ───────────────────────────────────────────────────────────────────

/** Encode a non-negative integer as a base62 string (no leading "0" except for 0 itself). */
export function toBase62(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`toBase62: integer ≥ 0 required, got ${n}`)
  if (n === 0) return "0"
  let out = ""
  let x = n
  while (x > 0) {
    out = ALPHABET[x % 62] + out
    x = Math.floor(x / 62)
  }
  return out
}

/** Decode a base62 string back to its integer. Throws on invalid characters. */
export function fromBase62(s: string): number {
  if (s.length === 0) throw new Error("fromBase62: empty string")
  let n = 0
  for (const ch of s) {
    const d = ALPHABET.indexOf(ch)
    if (d < 0) throw new Error(`fromBase62: invalid char '${ch}'`)
    n = n * 62 + d
  }
  return n
}

// ── hash (deterministic, truncatable) ────────────────────────────────────────

const CODE_SPACE = 62 ** CODE_LEN // number of distinct truncated codes

/** FNV-1a 32-bit. */
function fnv1a(input: string): number {
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

/** Full 32-bit hash of a string. */
export function shortHash(input: string): number {
  return fmix32(fnv1a(input))
}

/** Truncated code = the first CODE_LEN base62 chars of the full hash. This is where collisions live. */
export function hashTruncCode(input: string, len = CODE_LEN): string {
  const full = toBase62(shortHash(input))
  return full.length <= len ? full.padStart(len, "0") : full.slice(0, len)
}

// ── collision detection & resolution ─────────────────────────────────────────

/** True iff `code` is already mapped to a (different) URL. */
export function detectCollision(map: ShortMap, code: string, url?: string): boolean {
  const existing = map.get(code)
  if (!existing) return false
  return url === undefined ? true : existing.url !== url
}

/**
 * Resolve a collision by re-hashing with a per-attempt salt until the code is free.
 * `salted` strategy. Deterministic: same map + url ⇒ same resolved code.
 */
export function resolveSalted(map: ShortMap, url: string, len = CODE_LEN): string {
  let attempt = 0
  for (;;) {
    const candidate = hashTruncCode(`${url}#${attempt}`, len)
    const existing = map.get(candidate)
    if (!existing || existing.url === url) return candidate
    attempt++
  }
}

/**
 * Resolve a collision by incrementing the truncated code's integer value until free.
 * `increment` resolution. Wraps within the code space so it stays CODE_LEN chars.
 */
export function resolveIncrement(map: ShortMap, code: string, len = CODE_LEN): string {
  let n = fromBase62(code)
  for (let i = 0; i < CODE_SPACE; i++) {
    const candidate = toBase62(n).padStart(len, "0").slice(0, len)
    const existing = map.get(candidate)
    if (!existing) return candidate
    n = (n + 1) % CODE_SPACE
  }
  throw new Error("resolveIncrement: code space exhausted")
}

// ── shorten / redirect ───────────────────────────────────────────────────────

export interface ShortenOptions {
  /** Starting counter value for the `counter` strategy. */
  counterStart?: number
  /** Truncation length (default CODE_LEN). */
  len?: number
}

/**
 * Shorten `url` under `strategy`, inserting into (a copy of) `map`.
 * Returns the result plus a *new* map (the input map is not mutated).
 *
 *  - hash_trunc: code = hashTruncCode(url). If it collides, the collision is reported but the
 *    entry is NOT overwritten — the caller decides whether to resolve.
 *  - counter: code = toBase62(counterStart + map.size). Monotonic ⇒ never collides.
 *  - salted: hashTruncCode first; on collision, resolveSalted. Never collides.
 */
export function shorten(
  map: ShortMap,
  url: string,
  strategy: Strategy,
  opts: ShortenOptions = {},
): { result: ShortenResult; map: ShortMap } {
  const len = opts.len ?? CODE_LEN
  const next = new Map(map)
  let code: string
  let collision = false

  if (strategy === "counter") {
    const start = opts.counterStart ?? 0
    code = toBase62(start + next.size)
      .padStart(len, "0")
      .slice(0, len)
  } else if (strategy === "salted") {
    const base = hashTruncCode(url, len)
    if (detectCollision(next, base, url)) {
      code = resolveSalted(next, url, len)
      collision = true
    } else {
      code = base
    }
  } else {
    // hash_trunc
    code = hashTruncCode(url, len)
    collision = detectCollision(next, code, url)
  }

  // Only commit if the slot is free or already ours (idempotent re-shorten of same url).
  const existing = next.get(code)
  if (!existing || existing.url === url) {
    next.set(code, { url, strategy })
  }
  return { result: { code, url, strategy, collision }, map: next }
}

/** Look up where `code` redirects. found=false ⇒ unknown code (a 404 in a real shortener). */
export function redirect(map: ShortMap, code: string): RedirectResult {
  const entry = map.get(code)
  return entry ? { url: entry.url, found: true } : { url: null, found: false }
}

/** Build a fresh empty map. (Kept for symmetry / clarity at call sites.) */
export function emptyMap(): ShortMap {
  return new Map()
}
