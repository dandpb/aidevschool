// Pure hash-map-backed key-value store with TTL expiration. This is the
// concept the game teaches — every visual in the 3D scene is a projection of
// this object's state. Logic lives here so it can be unit-tested without a
// DOM/three.js.
//
// Invariants encoded (mirrors curriculum/02_key_value_store/docs/spec.md):
//   RF-001  SET stores.
//   RF-002  GET returns the value only if the entry is live (unexpired).
//   RF-003  DEL removes.
//   RF-004  EXPIRE attaches a TTL to an existing live entry.
//   RF-005  An expired entry is invisible to GET (read as MISS).
//   RF-006  PERSIST strips the TTL.
//   RF-011  Lazy TTL: GET never mutates; a separate sweep() reclaims memory.
//   RNF-003 SET on an existing key replaces in place — no torn/duplicate writes.

export type KvGetResult<TValue> =
  | { readonly status: "HIT"; readonly value: TValue }
  | { readonly status: "MISS" }

export type KvEntry<TValue> = {
  readonly key: string
  readonly value: TValue
  // epoch ms when the entry becomes invisible to GET; null = persistent.
  readonly expiresAt: number | null
  readonly createdAt: number
}

export type KvSetOptions = {
  // When set, the new entry gets a TTL relative to `now`. Default: persistent.
  readonly ttlMs?: number
}

// A read-only projection of one physical slot in a bucket — used by the
// renderer to decide whether to draw a lit or dark crate. Both live and
// expired entries appear here (expired entries still occupy memory until
// swept — the lazy-TTL invariant made visible).
export type KvCrateView = {
  readonly key: string
  readonly value: string
  readonly bucketIdx: number
  readonly chainPos: number // 0 = bottom of the stack
  readonly live: boolean
  readonly expiresAt: number | null
  readonly ttlRemainingMs: number | null // null = persistent; 0 = expired
  readonly ttlTotalMs: number | null // original TTL — drives the ring scale
}

// Deterministic, player-legible hash: sum of UTF-16 code units mod N.
// Chosen (per the plan's open question) so the player can predict the bucket
// by reading the HUD briefing — wrong-shelf PUTs are unambiguous.
export function hashKey(key: string, bucketCount: number): number {
  if (bucketCount <= 0 || !Number.isInteger(bucketCount)) {
    throw new Error(`bucketCount must be a positive integer, got ${bucketCount}`)
  }
  let sum = 0
  for (let i = 0; i < key.length; i += 1) {
    sum += key.charCodeAt(i)
  }
  return sum % bucketCount
}

export class KvStore<TValue = string> {
  public readonly bucketCount: number
  // Each bucket is a chain (linked-list-equivalent). Different keys that hash
  // to the same bucket append; a same-key SET replaces in place.
  private readonly buckets: KvEntry<TValue>[][]

  constructor(bucketCount: number) {
    if (bucketCount <= 0 || !Number.isInteger(bucketCount)) {
      throw new Error(`bucketCount must be a positive integer, got ${bucketCount}`)
    }
    this.bucketCount = bucketCount
    this.buckets = Array.from({ length: bucketCount }, () => [])
  }

  bucketIndex(key: string): number {
    return hashKey(key, this.bucketCount)
  }

  chainDepth(bucketIdx: number): number {
    const chain = this.buckets[bucketIdx]
    return chain === undefined ? 0 : chain.length
  }

  // Lazy TTL check — does not mutate. Used by GET to decide live vs MISS.
  private isLive(entry: KvEntry<TValue>, now: number): boolean {
    return entry.expiresAt === null || entry.expiresAt > now
  }

  set(key: string, value: TValue, now: number, options?: KvSetOptions): KvEntry<TValue> {
    const bucketIdx = this.bucketIndex(key)
    const chain = this.buckets[bucketIdx]
    if (chain === undefined) {
      throw new Error(`bucket ${bucketIdx} missing`)
    }
    const entry: KvEntry<TValue> = {
      key,
      value,
      createdAt: now,
      expiresAt: options?.ttlMs === undefined ? null : now + options.ttlMs,
    }
    const existingPos = chain.findIndex((candidate) => candidate.key === key)
    if (existingPos >= 0) {
      chain[existingPos] = entry
    } else {
      chain.push(entry)
    }
    return entry
  }

  get(key: string, now: number): KvGetResult<TValue> {
    const bucketIdx = this.bucketIndex(key)
    const chain = this.buckets[bucketIdx]
    if (chain === undefined) {
      return { status: "MISS" }
    }
    for (const entry of chain) {
      if (entry.key === key && this.isLive(entry, now)) {
        return { status: "HIT", value: entry.value }
      }
    }
    return { status: "MISS" }
  }

  // Returns true if a live entry was removed; false if MISS (missing/expired).
  del(key: string, now: number): boolean {
    const bucketIdx = this.bucketIndex(key)
    const chain = this.buckets[bucketIdx]
    if (chain === undefined) {
      return false
    }
    const pos = chain.findIndex((entry) => entry.key === key && this.isLive(entry, now))
    if (pos < 0) {
      return false
    }
    chain.splice(pos, 1)
    return true
  }

  // Attaches a TTL to an existing live entry. Returns false if the key is
  // missing or already expired (no-op).
  expire(key: string, ttlMs: number, now: number): boolean {
    if (ttlMs < 0 || !Number.isFinite(ttlMs)) {
      throw new Error(`ttlMs must be a finite non-negative number, got ${ttlMs}`)
    }
    return this.mutateLive(key, now, (entry) => ({ ...entry, expiresAt: now + ttlMs }))
  }

  // Strips the TTL, making the entry persistent. Returns false if missing.
  persist(key: string, now: number): boolean {
    return this.mutateLive(key, now, (entry) => ({ ...entry, expiresAt: null }))
  }

  // Proactive sweep — physically removes dark (expired) entries. GET does not
  // do this; the sweep is a separate background pass. Returns the count
  // removed. (Lazy + proactive sweep, both visualized in the scene.)
  sweep(now: number): number {
    let removed = 0
    for (const chain of this.buckets) {
      if (chain === undefined) {
        continue
      }
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        const entry = chain[i]
        if (entry === undefined) {
          continue
        }
        if (!this.isLive(entry, now)) {
          chain.splice(i, 1)
          removed += 1
        }
      }
    }
    return removed
  }

  // Snapshot for the renderer — every physical crate, lit or dark.
  view(now: number): KvCrateView[] {
    const out: KvCrateView[] = []
    for (let bucketIdx = 0; bucketIdx < this.buckets.length; bucketIdx += 1) {
      const chain = this.buckets[bucketIdx]
      if (chain === undefined) {
        continue
      }
      for (let chainPos = 0; chainPos < chain.length; chainPos += 1) {
        const entry = chain[chainPos]
        if (entry === undefined) {
          continue
        }
        const live = this.isLive(entry, now)
        const ttlRemainingMs = entry.expiresAt === null ? null : Math.max(0, entry.expiresAt - now)
        const ttlTotalMs = entry.expiresAt === null ? null : entry.expiresAt - entry.createdAt
        const value = typeof entry.value === "string" ? entry.value : String(entry.value)
        out.push({
          key: entry.key,
          value,
          bucketIdx,
          chainPos,
          live,
          expiresAt: entry.expiresAt,
          ttlRemainingMs,
          ttlTotalMs,
        })
      }
    }
    return out
  }

  private mutateLive(
    key: string,
    now: number,
    fn: (entry: KvEntry<TValue>) => KvEntry<TValue>,
  ): boolean {
    const bucketIdx = this.bucketIndex(key)
    const chain = this.buckets[bucketIdx]
    if (chain === undefined) {
      return false
    }
    for (let i = 0; i < chain.length; i += 1) {
      const entry = chain[i]
      if (entry === undefined) {
        continue
      }
      if (entry.key === key && this.isLive(entry, now)) {
        chain[i] = fn(entry)
        return true
      }
    }
    return false
  }
}
