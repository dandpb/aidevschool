import { bucketOf, type HashStrength, hashKey } from "./hash"

/**
 * Hash-addressed key-value store with TTL expiry. Deterministic and headless-testable:
 * the clock is injected (`now()` returns ms), so expiry is replayable in Vitest with no GPU.
 * ZERO `three` imports here — all rules live in this module; the scene only renders state.
 */

export type Clock = () => number

/** A stored value plus optional TTL deadline (epoch ms). `deadline === null` ⇒ never expires. */
export interface Entry<V = string> {
  value: V
  /** Absolute expiry in ms; null means no expiry. */
  deadline: number | null
}

/** Key → entry. The authoritative state. */
export type StoreMap<V = string> = Map<string, Entry<V>>

export interface PutOptions {
  /** TTL in ms from `now()`. Omit / null ⇒ no expiry (persists until overwritten or deleted). */
  ttlMs?: number | null
}

export interface Store<V = string> {
  readonly shelfCount: number
  /**
   * Hash strength used to address keys to shelves. `"full"` ⇒ good hash, even spread; a small
   * number ⇒ a poor prefix-only hash that skews (the L4 lesson). Defaults to `"full"`.
   */
  hashStrength: HashStrength
  /** All keys → entries (including not-yet-swept expired ones). Use sparingly; prefer `get`. */
  entries: StoreMap<V>
}

export function createStore<V = string>(
  shelfCount: number,
  hashStrength: HashStrength = "full",
): Store<V> {
  if (shelfCount <= 0) throw new Error("shelf count must be > 0")
  return { shelfCount, hashStrength, entries: new Map() }
}

/** The shelf a key hashes to. Stable: same key + same n + same strength ⇒ same shelf, every time. */
export function shelfOf<V>(store: Store<V>, key: string): number {
  return bucketOf(key, store.shelfCount, store.hashStrength)
}

/** Re-address every entry to a new shelf count and/or hash strength (L4 dials strength). */
export function readdress<V>(
  store: Store<V>,
  opts: { shelfCount?: number; hashStrength?: HashStrength },
): Store<V> {
  const next = createStore<V>(
    opts.shelfCount ?? store.shelfCount,
    opts.hashStrength ?? store.hashStrength,
  )
  next.entries = new Map(store.entries)
  return next
}

/**
 * Store (or replace) a value at the key's hashed shelf. Overwriting replaces any prior TTL.
 * Returns the entry that was written.
 */
export function put<V>(
  store: Store<V>,
  key: string,
  value: V,
  now: Clock,
  opts: PutOptions = {},
): Entry<V> {
  const deadline = opts.ttlMs != null && opts.ttlMs > 0 ? now() + opts.ttlMs : null
  const entry: Entry<V> = { value, deadline }
  store.entries.set(key, entry)
  return entry
}

/** Remaining lifetime in ms (`null` ⇒ no expiry), or `-1` if missing / already past deadline. */
export function remainingTtl<V>(store: Store<V>, key: string, now: Clock): number | null {
  const entry = store.entries.get(key)
  if (entry === undefined) return -1
  if (isExpired(entry, now())) return -1
  return entry.deadline
}

/** Has this entry passed its deadline at `t`? No-deadline entries are never expired. */
export function isExpired<V>(entry: Entry<V>, t: number): boolean {
  return entry.deadline !== null && t >= entry.deadline
}

/**
 * Read a value. Returns `null` for a missing key OR a key past its deadline — expired is invisible.
 * Does NOT mutate the store; reclaim happens lazily in `sweepExpired`.
 */
export function get<V>(store: Store<V>, key: string, now: Clock): V | null {
  const entry = store.entries.get(key)
  if (entry === undefined) return null
  if (isExpired(entry, now())) return null
  return entry.value
}

/**
 * Remove a key. Deleting a missing or already-expired key is a successful no-op.
 * Returns true iff a *live* entry was removed.
 */
export function del<V>(store: Store<V>, key: string, now: Clock): boolean {
  const entry = store.entries.get(key)
  if (entry === undefined) return false
  store.entries.delete(key)
  return !isExpired(entry, now())
}

/**
 * Reclaim every entry whose deadline has passed at `now()`. Removes ONLY expired entries;
 * live entries (no deadline, or deadline in the future) are untouched. Returns the reclaimed keys.
 */
export function sweepExpired<V>(store: Store<V>, now: Clock): string[] {
  const t = now()
  const reclaimed: string[] = []
  for (const [key, entry] of store.entries) {
    if (isExpired(entry, t)) {
      store.entries.delete(key)
      reclaimed.push(key)
    }
  }
  return reclaimed
}

/** Count of live (non-expired) entries. */
export function liveCount<V>(store: Store<V>, now: Clock): number {
  const t = now()
  let n = 0
  for (const entry of store.entries.values()) if (!isExpired(entry, t)) n++
  return n
}

/** key → shelf assignment over the live entries (expired entries excluded). */
export function assignToShelves<V>(store: Store<V>, now: Clock): Map<string, number> {
  const t = now()
  const out = new Map<string, number>()
  for (const [key, entry] of store.entries) {
    if (!isExpired(entry, t)) out.set(key, bucketOf(key, store.shelfCount, store.hashStrength))
  }
  return out
}

/** Per-shelf live key counts. Shelves with zero keys are included (length === shelfCount). */
export function loadPerShelf<V>(store: Store<V>, now: Clock): number[] {
  const loads = new Array<number>(store.shelfCount).fill(0)
  for (const shelf of assignToShelves(store, now).values()) {
    loads[shelf] = (loads[shelf] ?? 0) + 1
  }
  return loads
}

/** Load skew = max shelf load / mean shelf load. 1.0 is perfectly even. */
export function loadSkew<V>(store: Store<V>, now: Clock): number {
  const loads = loadPerShelf(store, now)
  const total = loads.reduce((a, b) => a + b, 0)
  if (total === 0) return 1
  const mean = total / loads.length
  const max = Math.max(...loads)
  return max / mean
}

/** For diagnostics / determinism checks: a key's raw 32-bit hash at a given strength. */
export function rawHash(key: string, strength: HashStrength = "full"): number {
  return hashKey(key, strength)
}
