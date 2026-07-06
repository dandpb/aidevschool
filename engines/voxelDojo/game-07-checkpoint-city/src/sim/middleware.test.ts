import { describe, expect, it } from "vitest"
import {
  decodeJwt,
  defaultStack,
  forgeWithSecret,
  hmacSha256,
  hmacSign,
  hmacVerify,
  type Layer,
  makeAuthLayer,
  makeLoggingLayer,
  makeRateLimitLayer,
  type Request,
  runPipeline,
  sha256,
  tamperPayload,
  tamperSignature,
} from "./middleware"

const SECRET = "city-secret-do-not-leak"

// helper: encode an ascii string straight to bytes
function b(s: string): Uint8Array {
  return new Uint8Array(s.split("").map((c) => c.charCodeAt(0)))
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("")
}

describe("SHA-256 — FIPS 180-4 test vectors", () => {
  // NIST reference vectors. These prove the digest is the real algorithm, not a toy hash.
  it('sha256("") == e3b0c442...', () => {
    expect(hex(sha256(new Uint8Array()))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    )
  })
  it('sha256("abc") == ba7816bf...', () => {
    expect(hex(sha256(b("abc")))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    )
  })
  it("digests a long message (>1 block) correctly", () => {
    const msg = "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq" // 448 bits → spans 2 blocks
    expect(hex(sha256(b(msg)))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    )
  })
  it("is deterministic — same input ⇒ same digest", () => {
    expect(hex(sha256(b("checkpoint")))).toBe(hex(sha256(b("checkpoint"))))
  })
})

describe("HMAC-SHA256 — RFC 4231 vectors (the cryptographic core)", () => {
  // RFC 4231 Test Case 1: key 0x0b*20, data "Hi There"
  it("case 1: key=0x0b*20, data='Hi There'", () => {
    const key = new Uint8Array(20).fill(0x0b)
    const got = hex(hmacSha256(key, b("Hi There")))
    expect(got).toBe("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7")
  })
  // RFC 4231 Test Case 2: key "Jefe", data "what do ya want for nothing?"
  it("case 2: key='Jefe'", () => {
    const got = hex(hmacSha256(b("Jefe"), b("what do ya want for nothing?")))
    expect(got).toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843")
  })
  // RFC 4231 Test Case 6: 131-byte key (> block size 64), data "Test Using Larger Than Block-Size Key – Hash Key First"
  it("case 6: long key is hashed first", () => {
    const key = new Uint8Array(131).fill(0xaa)
    const data = b("Test Using Larger Than Block-Size Key - Hash Key First")
    expect(hex(hmacSha256(key, data))).toBe(
      "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54",
    )
  })
  it("HMAC with a long key equals HMAC with the hash of that key (the spec behavior)", () => {
    const longKey = new Uint8Array(131).fill(0xaa)
    const hashedKey = sha256(longKey)
    expect(hex(hmacSha256(longKey, b("data")))).toBe(hex(hmacSha256(hashedKey, b("data"))))
  })
})

describe("JWT (HS256) — sign then verify round-trip", () => {
  it("a validly-signed token verifies against the right secret", () => {
    const token = hmacSign({ sub: "alice", role: "admin" }, SECRET)
    expect(token.split(".")).toHaveLength(3)
    expect(hmacVerify(token, SECRET)).toBe(true)
    expect(decodeJwt(token)).toMatchObject({ sub: "alice", role: "admin" })
  })

  it("a token does NOT verify against a different secret", () => {
    const token = hmacSign({ sub: "alice" }, SECRET)
    expect(hmacVerify(token, "wrong-secret")).toBe(false)
  })
})

describe("the auth wall — forged badge lessons", () => {
  it("a token signed with the wrong secret is rejected", () => {
    const forged = forgeWithSecret({ sub: "alice" }, "attacker-secret")
    const stack = [makeLoggingLayer(), makeAuthLayer(SECRET)]
    const result = runPipeline(stack, { id: "r1", token: forged })
    expect(result.reachedHandler).toBe(false)
    expect(result.rejectedAt).toBe("auth")
    expect(result.reason).toBe("rejected")
  })

  it("a token whose signature was physically tampered is rejected", () => {
    const valid = hmacSign({ sub: "alice" }, SECRET)
    const tampered = tamperSignature(valid)
    expect(hmacVerify(tampered, SECRET)).toBe(false)
    const result = runPipeline([makeAuthLayer(SECRET)], { id: "r1", token: tampered })
    expect(result.rejectedAt).toBe("auth")
  })

  it("a token whose payload was edited (signature unchanged) is rejected", () => {
    const valid = hmacSign({ sub: "alice", role: "user" }, SECRET)
    const escalated = tamperPayload(valid, "role", "admin")
    expect(hmacVerify(escalated, SECRET)).toBe(false)
    expect(decodeJwt(escalated)?.role).toBe("admin") // payload reads admin, but untrusted
    const result = runPipeline([makeAuthLayer(SECRET)], { id: "r1", token: escalated })
    expect(result.rejectedAt).toBe("auth")
  })

  it("a request with no token is rejected at auth", () => {
    const result = runPipeline([makeAuthLayer(SECRET)], { id: "r1", token: null })
    expect(result.reachedHandler).toBe(false)
    expect(result.rejectedAt).toBe("auth")
  })
})

describe("runPipeline — the rule 'order matters'", () => {
  const stack = defaultStack(SECRET, 3)
  const validReq = (): Request => ({ id: "r", token: hmacSign({ sub: "alice" }, SECRET) })

  it("a valid request under the rate cap reaches the handler", () => {
    const result = runPipeline(stack, validReq())
    expect(result.reachedHandler).toBe(true)
    expect(result.rejectedAt).toBe(null)
    expect(result.reason).toBe(null)
  })

  it("logging never rejects — it is the always-pass outer wall", () => {
    const result = runPipeline([makeLoggingLayer()], validReq())
    expect(result.reachedHandler).toBe(true)
  })

  it("rate-limit rejects the (cap+1)th request and records the reject point", () => {
    const cap3 = defaultStack(SECRET, 3)
    const r1 = runPipeline(cap3, validReq())
    const r2 = runPipeline(cap3, validReq())
    const r3 = runPipeline(cap3, validReq())
    const r4 = runPipeline(cap3, validReq()) // the (3+1)th → turned back
    expect(r1.reachedHandler && r2.reachedHandler && r3.reachedHandler).toBe(true)
    expect(r4.reachedHandler).toBe(false)
    expect(r4.rejectedAt).toBe("rate-limit")
    expect(r4.reason).toBe("rejected")
  })

  it("reordering layers changes the reject point: logging → rate-limit → auth puts rate-limit first", () => {
    const layers: Layer[] = [makeLoggingLayer(), makeRateLimitLayer(0), makeAuthLayer(SECRET)]
    // rate-limit cap 0 ⇒ the very first request is rejected by rate-limit, masking auth entirely.
    const result = runPipeline(layers, validReq())
    expect(result.rejectedAt).toBe("rate-limit")
  })

  it("a reject earlier in the stack masks later layers (auth before rate-limit vs swapped)", () => {
    // order A: auth then rate-limit — a forged token dies at auth (rate-limit never sees it)
    const authFirst: Layer[] = [makeAuthLayer(SECRET), makeRateLimitLayer(0)]
    const forged = forgeWithSecret({ sub: "x" }, "bad")
    const aResult = runPipeline(authFirst, { id: "r", token: forged })
    expect(aResult.rejectedAt).toBe("auth")

    // order B: rate-limit(cap 0) then auth — same forged token now dies at rate-limit instead
    const rateFirst: Layer[] = [makeRateLimitLayer(0), makeAuthLayer(SECRET)]
    const bResult = runPipeline(rateFirst, { id: "r", token: forged })
    expect(bResult.rejectedAt).toBe("rate-limit")
  })

  it("short-circuit and reject both halt the walk identically, distinguishing only the reason", () => {
    const shortCircuit: Layer = { name: "guard", check: () => "short-circuit" }
    const result = runPipeline([shortCircuit], validReq())
    expect(result.reachedHandler).toBe(false)
    expect(result.rejectedAt).toBe("guard")
    expect(result.reason).toBe("short-circuited")
  })

  it("an empty stack vacuously reaches the handler", () => {
    expect(runPipeline([], validReq()).reachedHandler).toBe(true)
  })
})

describe("determinism", () => {
  it("same secret + same payload ⇒ byte-identical token, every time", () => {
    expect(hmacSign({ sub: "a" }, SECRET)).toBe(hmacSign({ sub: "a" }, SECRET))
  })
  it("rate-limit is purely order-driven: identical request sequences consume the same count", () => {
    const s1 = makeRateLimitLayer(2)
    const s2 = makeRateLimitLayer(2)
    const req = { id: "r", token: null }
    for (let i = 0; i < 5; i++) s1.check(req)
    for (let i = 0; i < 5; i++) s2.check(req)
    expect(s1.used()).toBe(s2.used())
    expect(s1.used()).toBe(5)
  })
  it("verify is a pure function of (token, secret) — no hidden state", () => {
    const token = hmacSign({ sub: "a" }, SECRET)
    for (let i = 0; i < 10; i++) expect(hmacVerify(token, SECRET)).toBe(true)
  })
})
