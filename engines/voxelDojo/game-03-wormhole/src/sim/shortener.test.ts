import { describe, expect, it } from "vitest"
import {
  CODE_LEN,
  detectCollision,
  emptyMap,
  fromBase62,
  hashTruncCode,
  redirect,
  resolveIncrement,
  resolveSalted,
  type ShortMap,
  shorten,
  shortHash,
  toBase62,
} from "./shortener"

describe("base62 round-trip (proof 1)", () => {
  it("toBase62 ∘ fromBase62 = identity across a broad integer range", () => {
    const samples = [0, 1, 7, 61, 62, 63, 3843, 3844, 123456789, 0xffffffff]
    for (const n of samples) {
      expect(fromBase62(toBase62(n))).toBe(n)
    }
  })

  it("toBase62 produces the canonical base62 alphabet (0-9A-Za-z)", () => {
    expect(toBase62(0)).toBe("0")
    expect(toBase62(61)).toBe("z")
    expect(toBase62(62)).toBe("10")
    // 61 ('z') is the last digit of the alphabet; 61 → 'z', 62 → '10'
    expect(toBase62(3843)).toBe("zz") // 61*62 + 61
    expect(toBase62(3844)).toBe("100")
  })

  it("fromBase62 rejects invalid characters", () => {
    expect(() => fromBase62("!")).toThrow()
    expect(() => fromBase62("")).toThrow()
    expect(() => fromBase62("A-1")).toThrow()
  })
})

describe("counter strategy never collides (proof 2)", () => {
  it("shortening N distinct URLs under counter yields N distinct codes", () => {
    const urls = Array.from({ length: 50 }, (_, i) => `https://host.example/p${i}`)
    let map: ShortMap = emptyMap()
    const codes = new Set<string>()
    for (const url of urls) {
      const { result, map: next } = shorten(map, url, "counter", { counterStart: 100 })
      expect(result.collision).toBe(false)
      codes.add(result.code)
      map = next
    }
    expect(codes.size).toBe(urls.length)
    // counter codes are monotonic base62 starting at 100 → "1C"
    expect([...map.values()].every((e) => e.strategy === "counter")).toBe(true)
  })

  it("counter codes are the base62 of counterStart + index", () => {
    const map: ShortMap = emptyMap()
    const { result: r0, map: m0 } = shorten(map, "https://a.io/x", "counter", { counterStart: 0 })
    expect(r0.code).toBe(toBase62(0).padStart(CODE_LEN, "0").slice(0, CODE_LEN))
    const { result: r1 } = shorten(m0, "https://a.io/y", "counter", { counterStart: 0 })
    expect(r1.code).toBe(toBase62(1).padStart(CODE_LEN, "0").slice(0, CODE_LEN))
  })
})

/** Fast O(n) birthday search for two URLs that share a truncation. */
function findColliding(): [string, string] {
  const base = "https://collision.test/"
  const seen = new Map<string, number>()
  for (let i = 0; i < 500_000; i++) {
    const url = `${base}${i}`
    const code = hashTruncCode(url)
    const prev = seen.get(code)
    if (prev !== undefined) return [`${base}${prev}`, url]
    seen.set(code, i)
  }
  throw new Error("no colliding pair")
}

describe("hash_trunc collides under constructed input + salted/increment resolve (proof 3)", () => {
  it("two URLs engineered to share a truncation collide under hash_trunc", () => {
    const [a, b] = findColliding()
    // Same truncation, distinct full hashes (a genuine collision, not the same string).
    expect(hashTruncCode(a)).toBe(hashTruncCode(b))
    expect(shortHash(a)).not.toBe(shortHash(b))

    let map: ShortMap = emptyMap()
    const { result: r1, map: m1 } = shorten(map, a, "hash_trunc")
    expect(r1.collision).toBe(false)
    map = m1
    const { result: r2 } = shorten(map, b, "hash_trunc")
    // The second URL truncates to the same code as the first → collision detected.
    expect(r2.code).toBe(r1.code)
    expect(r2.collision).toBe(true)
  })

  it("salted resolves a collision to a unique code and the new URL redirects correctly", () => {
    const [a, b] = findColliding()
    const collidingCode = hashTruncCode(a)
    expect(hashTruncCode(b)).toBe(collidingCode)

    // Stamp a; then shorten b under salted — b must resolve to a DIFFERENT, free code.
    let map: ShortMap = emptyMap()
    map = shorten(map, a, "hash_trunc").map
    expect(detectCollision(map, collidingCode, b)).toBe(true)

    const salted = shorten(map, b, "salted")
    map = salted.map
    expect(salted.result.collision).toBe(true) // a collision was encountered…
    expect(salted.result.code).not.toBe(collidingCode) // …and resolved to a fresh code
    expect(detectCollision(map, salted.result.code, b)).toBe(false)

    // resolveSalted against the same pre-stamp map agrees with the shorten result.
    expect(resolveSalted(map, b)).toBe(salted.result.code)

    // a is untouched at the colliding code; b is reachable at its salted code.
    expect(redirect(map, collidingCode).url).toBe(a)
    expect(redirect(map, salted.result.code).url).toBe(b)
  })

  it("increment resolution walks to the next free code", () => {
    const map: ShortMap = new Map([
      ["0000", { url: "https://a.io", strategy: "hash_trunc" }],
      ["0001", { url: "https://b.io", strategy: "hash_trunc" }],
    ])
    // 0000 and 0001 are taken → increment from 0000 lands on 0002.
    expect(resolveIncrement(map, "0000")).toBe("0002")
    expect(resolveIncrement(map, "0001")).toBe("0002")
  })
})

describe("determinism (proof 4)", () => {
  it("the same url + strategy + map always produce the same code", () => {
    const url = "https://determinism.test/same"
    const r1 = shorten(emptyMap(), url, "hash_trunc").result
    const r2 = shorten(emptyMap(), url, "hash_trunc").result
    expect(r1.code).toBe(r2.code)

    const c1 = shorten(emptyMap(), url, "counter", { counterStart: 5 }).result
    const c2 = shorten(emptyMap(), url, "counter", { counterStart: 5 }).result
    expect(c1.code).toBe(c2.code)
  })

  it("hashTruncCode is a pure function of its input", () => {
    const s = "https://anything.example/path?x=1"
    for (let i = 0; i < 5; i++) {
      expect(hashTruncCode(s)).toBe(hashTruncCode(s))
    }
  })
})

describe("redirect", () => {
  it("returns the destination for a known code and found=false for unknown", () => {
    const { map } = shorten(emptyMap(), "https://dest.example/here", "hash_trunc")
    const code = [...map.keys()][0] as string
    expect(redirect(map, code)).toEqual({ url: "https://dest.example/here", found: true })
    expect(redirect(map, "ZZZZZZ")).toEqual({ url: null, found: false })
  })
})
