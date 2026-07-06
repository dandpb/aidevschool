import { describe, expect, it } from "vitest"
import { bucketOf, hashKey } from "./hash"
import { keyStream, mulberry32 } from "./rng"
import {
  assignToShelves,
  type Clock,
  createStore,
  del,
  get,
  loadPerShelf,
  loadSkew,
  put,
  remainingTtl,
  sweepExpired,
} from "./store"

/** Fixed clock factory: a deterministic `now()` the tests control exactly. */
function fixedClock(t: number): Clock {
  return () => t
}

describe("same-key ⇒ same-shelf (the lesson of L1: stable hash)", () => {
  it("a key always lands on one shelf, regardless of how many times it is put", () => {
    const store = createStore<string>(8)
    const now = fixedClock(1000)
    const key = "user:42:cart"
    const shelfFirst = bucketOf(key, store.shelfCount)
    put(store, key, "v1", now)
    put(store, key, "v2", now)
    put(store, key, "v3", now)
    expect(shelfFirst).toBe(bucketOf(key, store.shelfCount))
    expect([...assignToShelves(store, now).values()]).toEqual([shelfFirst])
  })

  it("distinct keys spread across shelves (avalanche), with no collisions at small n", () => {
    const store = createStore<string>(8)
    const now = fixedClock(0)
    const keys = keyStream(mulberry32(7), 200)
    for (const k of keys) put(store, k, "x", now)
    const shelves = new Set(loadPerShelf(store, now))
    expect(shelves.size).toBeGreaterThan(1) // spread, not all-on-one
  })
})

describe("TTL expiry returns null after the deadline (the lesson of L3)", () => {
  it("get returns the value before the deadline and null at/after it", () => {
    const start = 1000
    let t = start
    const clock: Clock = () => t
    const store = createStore<string>(4)
    put(store, "session:abc", "data", clock, { ttlMs: 500 })
    expect(get(store, "session:abc", clock)).toBe("data") // before deadline
    expect(remainingTtl(store, "session:abc", clock)).toBe(start + 500)
    t = start + 499
    expect(get(store, "session:abc", clock)).toBe("data") // last instant of life
    t = start + 500
    expect(get(store, "session:abc", clock)).toBe(null) // deadline reached ⇒ invisible
  })

  it("a no-TTL put persists forever and never returns null from expiry", () => {
    const store = createStore<string>(4)
    put(store, "config:port", "8080", fixedClock(0)) // no ttl
    expect(get(store, "config:port", fixedClock(1_000_000_000))).toBe("8080")
    expect(remainingTtl(store, "config:port", fixedClock(1_000_000_000))).toBe(null)
  })

  it("overwriting replaces the prior TTL", () => {
    let t = 0
    const clock: Clock = () => t
    const store = createStore<string>(4)
    put(store, "k", "v1", clock, { ttlMs: 100 })
    put(store, "k", "v2", clock) // no ttl ⇒ persistent
    t = 9999
    expect(get(store, "k", clock)).toBe("v2")
  })
})

describe("sweep removes ONLY expired entries (the lesson of L3 reclaim)", () => {
  it("sweep reclaims past-deadline keys and leaves live + no-deadline keys untouched", () => {
    let t = 0
    const clock: Clock = () => t
    const store = createStore<string>(6)
    put(store, "a", "1", clock, { ttlMs: 50 }) // will expire
    put(store, "b", "2", clock, { ttlMs: 200 }) // still live at t=100
    put(store, "c", "3", clock) // no deadline
    put(store, "d", "4", clock, { ttlMs: 50 }) // will expire

    t = 100
    const reclaimed = sweepExpired(store, clock)
    expect(new Set(reclaimed)).toEqual(new Set(["a", "d"]))
    expect(get(store, "a", clock)).toBe(null)
    expect(get(store, "b", clock)).toBe("2")
    expect(get(store, "c", clock)).toBe("3")
  })

  it("del of an expired key is a successful no-op returning false (live entry only)", () => {
    let t = 0
    const clock: Clock = () => t
    const store = createStore<string>(4)
    put(store, "k", "v", clock, { ttlMs: 10 })
    t = 20
    expect(del(store, "k", clock)).toBe(false) // already expired, not a live removal
    expect(get(store, "k", clock)).toBe(null)
  })
})

describe("determinism (injected clock + seeded RNG ⇒ replayable store)", () => {
  it("two stores fed the same seed + same clock reach identical state", () => {
    const keys = keyStream(mulberry32(42), 100)
    const build = (): Map<string, string> => {
      const store = createStore<string>(8)
      let t = 5000
      const clock: Clock = () => t
      keys.forEach((k, i) => {
        t = 5000 + i * 10
        put(store, k, `v${i}`, clock, { ttlMs: i % 3 === 0 ? 25 : null })
      })
      t = 6000
      return new Map(
        [...store.entries.entries()].map(([k, e]) => [k, `${e.value}:${e.deadline ?? "∞"}`]),
      )
    }
    expect([...build().entries()]).toEqual([...build().entries()])
  })

  it("bucketOf is stable across runs: hashKey(key) % n is a pure function", () => {
    expect(hashKey("anything")).toBe(hashKey("anything"))
    expect(bucketOf("anything", 16)).toBe(bucketOf("anything", 16))
    // and it lands in range
    for (const n of [1, 2, 4, 8, 16]) expect(bucketOf("anything", n)).toBeLessThan(n)
  })
})

describe("load skew (the lesson of L4: a weak hash skews; a stronger hash evens the load)", () => {
  it("a poor prefix-only hash collides similar keys on one shelf and skews", () => {
    const keys = keyStream(mulberry32(99), 1000, 0.7) // lumpy: many duplicate `hot:*` keys
    const now = fixedClock(0)
    const weak = createStore<string>(8, 2) // fold only first 2 chars ⇒ collisions
    for (const k of keys) put(weak, k, "x", now)
    expect(loadSkew(weak, now)).toBeGreaterThan(1.6)
  })

  it("dialing the hash strength up spreads the same keys across shelves (skew drops)", () => {
    const keys = keyStream(mulberry32(99), 1000, 0.7)
    const now = fixedClock(0)
    const weak = createStore<string>(8, 2)
    const strong = createStore<string>(8, "full")
    for (const k of keys) {
      put(weak, k, "x", now)
      put(strong, k, "x", now)
    }
    expect(loadSkew(strong, now)).toBeLessThan(loadSkew(weak, now))
    expect(loadSkew(strong, now)).toBeLessThanOrEqual(1.6)
  })
})
