import { describe, expect, it } from "vitest"
import { hashKey, KvStore } from "./kvstore"

describe("hashKey", () => {
  it("routes by sum-of-char-codes mod N (player-legible)", () => {
    // u(117)+s(115)+e(101)+r(114)+:(58)+4(52)+2(50) = 607; 607 % 8 = 7
    expect(hashKey("user:42", 8)).toBe(7)
    // c(99)+a(97)+r(114)+t(116)+:(58)+9(57) = 541; 541 % 8 = 5
    expect(hashKey("cart:9", 8)).toBe(5)
  })

  it("is deterministic — same key always lands in the same bucket", () => {
    const first = hashKey("user:42", 8)
    for (let i = 0; i < 5; i += 1) {
      expect(hashKey("user:42", 8)).toBe(first)
    }
  })

  it("rejects non-positive or non-integer bucket counts", () => {
    expect(() => hashKey("x", 0)).toThrow()
    expect(() => hashKey("x", -1)).toThrow()
    expect(() => hashKey("x", 2.5)).toThrow()
  })
})

describe("KvStore CRUD", () => {
  it("round-trips SET then GET (RF-001, RF-002)", () => {
    const store = new KvStore(8)
    store.set("user:42", "alice", 0)
    expect(store.get("user:42", 0)).toEqual({ status: "HIT", value: "alice" })
  })

  it("GET returns MISS for unknown keys", () => {
    const store = new KvStore(8)
    expect(store.get("nope", 0)).toEqual({ status: "MISS" })
  })

  it("DEL removes a live key (RF-003)", () => {
    const store = new KvStore(8)
    store.set("k", "v", 0)
    expect(store.del("k", 0)).toBe(true)
    expect(store.get("k", 0)).toEqual({ status: "MISS" })
  })

  it("DEL on an unknown key reports MISS (no silent success)", () => {
    const store = new KvStore(8)
    expect(store.del("k", 0)).toBe(false)
  })

  it("SET on an existing key replaces the value in place — no torn writes (RNF-003)", () => {
    const store = new KvStore(8)
    store.set("k", "v1", 0)
    store.set("k", "v2", 10)
    expect(store.chainDepth(store.bucketIndex("k"))).toBe(1)
    expect(store.get("k", 10)).toEqual({ status: "HIT", value: "v2" })
  })
})

describe("KvStore TTL", () => {
  it("expired keys are invisible to GET (RF-005, RF-011 — lazy TTL)", () => {
    const store = new KvStore(8)
    store.set("k", "v", 0, { ttlMs: 100 })
    expect(store.get("k", 50)).toEqual({ status: "HIT", value: "v" })
    expect(store.get("k", 100)).toEqual({ status: "MISS" })
    expect(store.get("k", 150)).toEqual({ status: "MISS" })
  })

  it("expired keys still occupy memory until swept (proactive sweep reclaims)", () => {
    const store = new KvStore(8)
    store.set("k", "v", 0, { ttlMs: 100 })
    expect(store.chainDepth(store.bucketIndex("k"))).toBe(1)
    expect(store.get("k", 150)).toEqual({ status: "MISS" })
    // Lazy: GET did not reclaim.
    expect(store.chainDepth(store.bucketIndex("k"))).toBe(1)
    const swept = store.sweep(200)
    expect(swept).toBe(1)
    expect(store.chainDepth(store.bucketIndex("k"))).toBe(0)
    expect(store.sweep(300)).toBe(0)
  })

  it("EXPIRE attaches a TTL to a persistent key (RF-004)", () => {
    const store = new KvStore(8)
    store.set("k", "v", 0)
    expect(store.expire("k", 100, 10)).toBe(true)
    expect(store.get("k", 50)).toEqual({ status: "HIT", value: "v" })
    expect(store.get("k", 200)).toEqual({ status: "MISS" })
  })

  it("PERSIST strips the TTL (RF-006)", () => {
    const store = new KvStore(8)
    store.set("k", "v", 0, { ttlMs: 100 })
    expect(store.persist("k", 50)).toBe(true)
    expect(store.get("k", 9999)).toEqual({ status: "HIT", value: "v" })
  })

  it("EXPIRE / PERSIST on a missing key is a no-op", () => {
    const store = new KvStore(8)
    expect(store.expire("missing", 100, 0)).toBe(false)
    expect(store.persist("missing", 0)).toBe(false)
  })

  it("EXPIRE rejects non-finite or negative TTLs", () => {
    const store = new KvStore(8)
    store.set("k", "v", 0)
    expect(() => store.expire("k", -1, 10)).toThrow()
    expect(() => store.expire("k", Number.POSITIVE_INFINITY, 10)).toThrow()
  })
})

describe("KvStore collisions", () => {
  it("two different keys hashing to the same bucket form a chain", () => {
    const store = new KvStore(4) // smaller ring → easier collisions
    // 'a'(97), 'e'(101), 'i'(105) all hash to bucket 1 mod 4
    expect(store.bucketIndex("a")).toBe(1)
    expect(store.bucketIndex("e")).toBe(1)
    expect(store.bucketIndex("i")).toBe(1)
    store.set("a", "1", 0)
    store.set("e", "2", 0)
    expect(store.chainDepth(1)).toBe(2)
    expect(store.get("a", 0)).toEqual({ status: "HIT", value: "1" })
    expect(store.get("e", 0)).toEqual({ status: "HIT", value: "2" })
    // Third collision extends the chain.
    store.set("i", "3", 0)
    expect(store.chainDepth(1)).toBe(3)
  })

  it("DEL on a collided key only removes that key, not the chain", () => {
    const store = new KvStore(4)
    store.set("a", "1", 0)
    store.set("e", "2", 0)
    expect(store.del("a", 0)).toBe(true)
    expect(store.chainDepth(1)).toBe(1)
    expect(store.get("a", 0)).toEqual({ status: "MISS" })
    expect(store.get("e", 0)).toEqual({ status: "HIT", value: "2" })
  })

  it("view() projects both live and dark crates with chain positions", () => {
    const store = new KvStore(4)
    store.set("a", "1", 0)
    store.set("e", "2", 0, { ttlMs: 100 })
    const view = store.view(200)
    expect(view).toHaveLength(2)
    const liveEntry = view.find((crate) => crate.key === "a")
    expect(liveEntry?.live).toBe(true)
    expect(liveEntry?.ttlRemainingMs).toBeNull()
    const darkEntry = view.find((crate) => crate.key === "e")
    expect(darkEntry?.live).toBe(false)
    expect(darkEntry?.ttlRemainingMs).toBe(0)
  })
})
