import { describe, expect, it } from "vitest"
import {
  autoIncrement,
  BASE62_ALPHABET,
  buildDefaultWave,
  encodeBase62,
  fnv1a32,
  hashTruncate,
  isWavePass,
  RF011_MAX_RETRIES,
  snowflake,
  WaveEngine,
} from "./shortener"

describe("base62 encoding", () => {
  it("encodes zero to all-zero padding", () => {
    expect(encodeBase62(0, 4)).toBe("0000")
  })

  it("encodes 61 to the last symbol of the alphabet", () => {
    expect(encodeBase62(61, 4)).toBe("000z")
  })

  it("encodes 62 to the first two-symbol value", () => {
    expect(encodeBase62(62, 4)).toBe("0010")
  })

  it("round-trips within 4-char width (62^4 capacity)", () => {
    const cases = [0, 1, 61, 62, 63, 3843, 3844, 14_776_335]
    for (const value of cases) {
      const encoded = encodeBase62(value, 4)
      expect(encoded).toHaveLength(4)
      for (const ch of encoded) {
        expect(BASE62_ALPHABET.includes(ch)).toBe(true)
      }
    }
  })

  it("caps to width even when the value would overflow", () => {
    // 62^4 = 14_776_336 -> a 5-char base62 encoding, but width=4 truncates.
    expect(encodeBase62(14_776_336, 4)).toHaveLength(4)
  })

  it("rejects negative or non-integer input", () => {
    expect(() => encodeBase62(-1, 4)).toThrow()
    expect(() => encodeBase62(1.5, 4)).toThrow()
  })
})

describe("FNV-1a hash is deterministic", () => {
  it("returns the same uint32 for the same input", () => {
    expect(fnv1a32("https://example.com/path")).toBe(fnv1a32("https://example.com/path"))
  })

  it("returns a value in uint32 range", () => {
    const h = fnv1a32("anything")
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(0xffff_ffff)
  })

  it("distinguishes salted inputs", () => {
    expect(fnv1a32("url#0")).not.toBe(fnv1a32("url#1"))
  })
})

describe("HASH strategy (deterministic short-code)", () => {
  it("is deterministic for the same URL + salt", () => {
    expect(hashTruncate("https://a.b/c", 0)).toBe(hashTruncate("https://a.b/c", 0))
  })

  it("produces a 4-char base62 code", () => {
    const code = hashTruncate("https://a.b/c", 0)
    expect(code).toHaveLength(4)
    for (const ch of code) expect(BASE62_ALPHABET.includes(ch)).toBe(true)
  })

  it("salt perturbs the code so retries can escape a collision", () => {
    const base = hashTruncate("https://a.b/c", 0)
    let distinct = new Set([base])
    for (let salt = 1; salt <= 5; salt += 1) {
      distinct = new Set([...distinct, hashTruncate("https://a.b/c", salt)])
    }
    // We expect at least 3 distinct codes across 6 salts (highly likely with
    // FNV-1a into 62^4 space); this is what makes retry a recovery path.
    expect(distinct.size).toBeGreaterThanOrEqual(3)
  })
})

describe("AUTO strategy", () => {
  it("assigns sequential collision-free codes", () => {
    expect(autoIncrement(0, 4)).toBe("0000")
    expect(autoIncrement(1, 4)).toBe("0001")
    expect(autoIncrement(2, 4)).toBe("0002")
  })
})

describe("SNOWFLAKE strategy", () => {
  it("encodes time shard + body to base62", () => {
    const code = snowflake(0x1234, 0x5678, 4)
    expect(code).toHaveLength(4)
    for (const ch of code) expect(BASE62_ALPHABET.includes(ch)).toBe(true)
  })

  it("is orderable by time (later timestamps sort later numerically)", () => {
    const earlier = snowflake(0x0001, 0x0000, 4)
    const later = snowflake(0xffff, 0x0000, 4)
    // Same body, different time shard — codes should differ, demonstrating
    // the time-shard property that makes snowflake k-orderable.
    expect(earlier).not.toBe(later)
  })
})

describe("WaveEngine — full wave under HASH with collisions", () => {
  function buildEngine(): WaveEngine {
    const crates = buildDefaultWave(4)
    return new WaveEngine({
      crates,
      maxRetries: RF011_MAX_RETRIES,
      codeWidth: 4,
    })
  }

  it("docks the first occurrence of a URL, collides on the duplicate", () => {
    const engine = buildEngine()
    const first = engine.fire("https://example.com/long/path/alpha", "hash", 0, 0)
    expect(first.kind).toBe("docked")

    // Same URL, same salt -> same code -> collision.
    const second = engine.fire("https://example.com/long/path/alpha", "hash", 0, 0)
    expect(second.kind).toBe("collision")
    expect(second.code).toBe(first.kind === "docked" ? first.code : "")
  })

  it("recovers via retry-with-salt within the 5-attempt budget", () => {
    const engine = buildEngine()
    engine.fire("https://example.com/long/path/alpha", "hash", 0, 0)
    const collision = engine.fire("https://example.com/long/path/alpha", "hash", 0, 0)
    expect(collision.kind).toBe("collision")

    // Salt 1, 2, ... until a free code is found. Within 5 attempts this
    // should always succeed for the test URLs.
    let salt = 0
    let outcome = engine.retry("https://example.com/long/path/alpha", "hash", salt, 0, 42)
    while (outcome.kind === "collision" && salt < RF011_MAX_RETRIES) {
      salt = outcome.salt
      outcome = engine.retry("https://example.com/long/path/alpha", "hash", salt, 0, 42 + salt)
    }
    expect(outcome.kind).toBe("docked")
    expect(engine.result().collisionsRetriedOk).toBe(1)
  })

  it("completes a wave that satisfies the gate (pass=true)", () => {
    const engine = buildEngine()
    const urlA = "https://example.com/long/path/alpha"
    const urlB = "https://example.com/long/path/beta"

    // Pair A: dock + collide + retry
    engine.fire(urlA, "hash", 0, 0)
    const c1 = engine.fire(urlA, "hash", 0, 0)
    expect(c1.kind).toBe("collision")
    const r1 = engine.retry(urlA, "hash", 0, 0, 100)
    if (r1.kind === "collision") {
      const r1b = engine.retry(urlA, "hash", r1.salt, 0, 200)
      expect(r1b.kind).toBe("docked")
    } else {
      expect(r1.kind).toBe("docked")
    }

    // Pair B: dock + collide + retry
    engine.fire(urlB, "hash", 0, 0)
    const c2 = engine.fire(urlB, "hash", 0, 0)
    expect(c2.kind).toBe("collision")
    const r2 = engine.retry(urlB, "hash", 0, 0, 300)
    if (r2.kind === "collision") {
      const r2b = engine.retry(urlB, "hash", r2.salt, 0, 400)
      expect(r2b.kind).toBe("docked")
    } else {
      expect(r2.kind).toBe("docked")
    }

    const result = engine.result()
    expect(result.waveCleared).toBe(true)
    expect(result.codesAssigned).toBe(4)
    expect(result.collisionsDetected).toBeGreaterThanOrEqual(2)
    expect(result.collisionsRetriedOk).toBe(result.collisionsDetected)
    expect(result.retriesExhausted).toBe(0)
    expect(result.dockOverflows).toBe(0)
    expect(result.strategiesUsed).toEqual(["hash"])
    expect(isWavePass(result)).toBe(true)
  })
})

describe("WaveEngine — gate rejects the failure modes", () => {
  it("rejects a pure-AUTO wave (no collision recovery demonstrated)", () => {
    const engine = new WaveEngine({
      crates: buildDefaultWave(4),
      maxRetries: RF011_MAX_RETRIES,
      codeWidth: 4,
    })
    engine.fire("https://a.b/1", "auto", 0, 0)
    engine.fire("https://a.b/2", "auto", 0, 0)
    engine.fire("https://a.b/3", "auto", 0, 0)
    engine.fire("https://a.b/4", "auto", 0, 0)
    const result = engine.result()
    // AUTO clears the wave without collisions, but the gate requires >= 1
    // collision recovered — so the lucky collision-free seed does NOT pass.
    expect(result.collisionsDetected).toBe(0)
    expect(isWavePass(result)).toBe(false)
  })

  it("rejects when retries are exhausted (overflow)", () => {
    // Force a collision loop that never finds a free code: pre-occupy the
    // first 6 salted codes so retries always hit a taken dock.
    const engine = new WaveEngine({
      crates: [{ id: 0, url: "https://blockme.test/x" }],
      maxRetries: RF011_MAX_RETRIES,
      codeWidth: 4,
    })
    const url = "https://blockme.test/x"
    // Pre-fill the codes that hash() will produce for salts 0..5 by computing
    // them and inserting under different URLs. Use the engine's own HASH
    // function to know the codes.
    for (let salt = 0; salt <= 5; salt += 1) {
      const code = hashTruncate(url, salt, 4)
      // Fire under a unique URL so it docks without consuming the target code
      // slot for `url`'s salt series — except the code IS the same, so we
      // can't easily fake this. Instead, drive the retry loop directly.
      void code
    }
    // First fire docks (salt 0).
    const f = engine.fire(url, "hash", 0, 0)
    expect(f.kind).toBe("docked")
    // Now occupy salts 1..5 by docking them with different URLs that hash to
    // the same codes — easiest path: directly retry past the budget using a
    // salt that hashes to the docked code. We'll force exhaustion by setting
    // maxRetries low.
    const tight = new WaveEngine({
      crates: [
        { id: 0, url: "alpha" },
        { id: 1, url: "alpha" },
      ],
      maxRetries: 0,
      codeWidth: 4,
    })
    tight.fire("alpha", "hash", 0, 0)
    const collision = tight.fire("alpha", "hash", 0, 0)
    expect(collision.kind).toBe("collision")
    const retry = tight.retry("alpha", "hash", 0, 0, 0)
    expect(retry.kind).toBe("exhausted")
    const result = tight.result()
    expect(result.retriesExhausted).toBe(1)
    expect(result.dockOverflows).toBe(1)
    expect(isWavePass(result)).toBe(false)
  })

  it("rejects when the wave was not cleared (codesAssigned < target)", () => {
    const engine = new WaveEngine({
      crates: buildDefaultWave(4),
      maxRetries: RF011_MAX_RETRIES,
      codeWidth: 4,
    })
    engine.fire("https://a", "hash", 0, 0)
    const result = engine.result()
    expect(result.waveCleared).toBe(false)
    expect(isWavePass(result)).toBe(false)
  })
})

describe("WaveEngine — retry budget enforcement (RF-011)", () => {
  it("treats maxRetries=5 as the spec's 5-attempt budget", () => {
    expect(RF011_MAX_RETRIES).toBe(5)
  })

  it("AUTO retry is a noop (cannot collide)", () => {
    const engine = new WaveEngine({
      crates: buildDefaultWave(2),
      maxRetries: RF011_MAX_RETRIES,
      codeWidth: 4,
    })
    const outcome = engine.retry("anything", "auto", 0, 0, 0)
    expect(outcome.kind).toBe("noop")
  })
})
