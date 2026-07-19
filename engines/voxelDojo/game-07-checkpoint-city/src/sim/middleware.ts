/**
 * Headless middleware-pipeline + JWT (HMAC-SHA256) simulation core.
 *
 * Pure TypeScript, ZERO `three` imports — runs in Vitest (node) and the browser
 * alike. Determinism comes from an injected secret and an explicit request
 * counter (no wall-clock). The SHA-256 / HMAC here is a real, self-contained
 * implementation (no node `crypto`) so a valid token verifies and a tampered one
 * does not — the cryptographic truth the auth layer depends on.
 *
 * Contract (PLAN §10):
 *   Layer = { name, check(req) → "pass" | "reject" | "short-circuit" }
 *   reject and short-circuit both halt the pipeline; only "pass" continues.
 *   runPipeline(layers, req) → { reachedHandler, rejectedAt, reason }
 *   hmacSign(payload, secret) / hmacVerify(token, secret) — base64url JWT-shaped tokens.
 */

// ── Layer + pipeline ───────────────────────────────────────────────────────

/** A request walking the city toward the citadel. `token` is the JWT bearer badge. */
export interface Request {
  id: string
  token: string | null
}

/** A layer's verdict. "pass" lets the request through; the other two halt the walk. */
export type LayerDecision = "pass" | "reject" | "short-circuit"

/** One middleware layer / city wall. `check` is pure given (layer state, request). */
export interface Layer {
  name: string
  check(req: Request): LayerDecision
}

export interface PipelineResult {
  /** true only if every layer passed and the request reached the citadel handler. */
  reachedHandler: boolean
  /** name of the layer that halted the request, or null if it reached the handler. */
  rejectedAt: string | null
  /** why it stopped: "rejected" | "short-circuited" | null (reached handler). */
  reason: "rejected" | "short-circuited" | null
}

/**
 * Walk `layers` in order. The first non-pass layer halts the walk and is recorded
 * as the reject point; if none halt, the request reaches the handler. This is the
 * single rule that makes "order matters" teachable: a reject earlier masks every
 * later layer.
 */
export function runPipeline(layers: readonly Layer[], req: Request): PipelineResult {
  for (const layer of layers) {
    const decision = layer.check(req)
    if (decision === "pass") continue
    return {
      reachedHandler: false,
      rejectedAt: layer.name,
      reason: decision === "reject" ? "rejected" : "short-circuited",
    }
  }
  return { reachedHandler: true, rejectedAt: null, reason: null }
}

// ── Built-in layers ────────────────────────────────────────────────────────

/** Logging layer — always passes (it records, never blocks). The outermost wall. */
export function makeLoggingLayer(): Layer {
  return { name: "logging", check: () => "pass" }
}

/** Auth layer — verifies the JWT signature with the shared secret. Rejects forged/absent tokens. */
export function makeAuthLayer(secret: string): Layer {
  return {
    name: "auth",
    check: (req) => {
      if (req.token === null) return "reject"
      return hmacVerify(req.token, secret) ? "pass" : "reject"
    },
  }
}

/** A rate-limit layer that also exposes its counter so the scene/HUD can show usage. */
export interface RateLimitLayer extends Layer {
  readonly cap: number
  /** how many requests have reached this layer so far this wave. */
  readonly used: () => number
}

/**
 * Rate-limit layer — passes the first `cap` requests it sees, rejects every one after.
 * The counter is internal mutable state, deterministic because there is no clock: only
 * the order of requests reaching this layer decides who is turned back. Rebuild the layer
 * (or the whole stack) per wave to reset.
 */
export function makeRateLimitLayer(cap: number): RateLimitLayer {
  let count = 0
  return {
    name: "rate-limit",
    cap,
    used: () => count,
    check: () => {
      count += 1
      return count > cap ? "reject" : "pass"
    },
  }
}

/** The standard wall order for the city: logging (outer) → auth → rate-limit → handler. */
export function defaultStack(secret: string, rateCap: number): Layer[] {
  return [makeLoggingLayer(), makeAuthLayer(secret), makeRateLimitLayer(rateCap)]
}

// ── SHA-256 (pure JS, big-endian, DataView-backed for type-safe word access) ──

const H0 = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]

// K round constants held in a DataView so reads are type-safe under noUncheckedIndexedAccess.
const K_BUF = new ArrayBuffer(64 * 4)
const K = new DataView(K_BUF)
{
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]
  for (let i = 0; i < 64; i++) K.setUint32(i * 4, k[i] ?? 0)
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

/** FIPS 180-4 SHA-256. Returns a fresh 32-byte digest. */
export function sha256(message: Uint8Array): Uint8Array {
  const len = message.length
  const bitLen = len * 8
  const paddedLen = Math.ceil((len + 9) / 64) * 64
  const buf = new ArrayBuffer(paddedLen)
  const bytes = new Uint8Array(buf)
  bytes.set(message)
  bytes[len] = 0x80
  const dv = new DataView(buf)
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000))
  dv.setUint32(paddedLen - 4, bitLen >>> 0)

  const state = new DataView(new ArrayBuffer(32))
  for (let i = 0; i < 8; i++) state.setUint32(i * 4, H0[i] ?? 0)
  const sched = new DataView(new ArrayBuffer(64 * 4))

  for (let off = 0; off < paddedLen; off += 64) {
    for (let t = 0; t < 16; t++) sched.setUint32(t * 4, dv.getUint32(off + t * 4))
    for (let t = 16; t < 64; t++) {
      const w15 = sched.getUint32((t - 15) * 4)
      const w2 = sched.getUint32((t - 2) * 4)
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10)
      const w = (sched.getUint32((t - 16) * 4) + s0 + sched.getUint32((t - 7) * 4) + s1) >>> 0
      sched.setUint32(t * 4, w)
    }
    let a = state.getUint32(0)
    let b = state.getUint32(4)
    let c = state.getUint32(8)
    let d = state.getUint32(12)
    let e = state.getUint32(16)
    let f = state.getUint32(20)
    let g = state.getUint32(24)
    let h = state.getUint32(28)
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K.getUint32(t * 4) + sched.getUint32(t * 4)) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    state.setUint32(0, (state.getUint32(0) + a) >>> 0)
    state.setUint32(4, (state.getUint32(4) + b) >>> 0)
    state.setUint32(8, (state.getUint32(8) + c) >>> 0)
    state.setUint32(12, (state.getUint32(12) + d) >>> 0)
    state.setUint32(16, (state.getUint32(16) + e) >>> 0)
    state.setUint32(20, (state.getUint32(20) + f) >>> 0)
    state.setUint32(24, (state.getUint32(24) + g) >>> 0)
    state.setUint32(28, (state.getUint32(28) + h) >>> 0)
  }

  const out = new Uint8Array(32)
  const outDv = new DataView(out.buffer)
  for (let i = 0; i < 8; i++) outDv.setUint32(i * 4, state.getUint32(i * 4))
  return out
}

/** HMAC-SHA256 (RFC 2104). Key is padded/hashed to the 64-byte block size. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const BLOCK = 64
  let k = key
  if (k.length > BLOCK) k = sha256(k)
  if (k.length < BLOCK) {
    const padded = new Uint8Array(BLOCK)
    padded.set(k)
    k = padded
  }
  const ipad = new Uint8Array(BLOCK)
  const opad = new Uint8Array(BLOCK)
  for (let i = 0; i < BLOCK; i++) {
    const byte = k[i] ?? 0
    ipad[i] = byte ^ 0x36
    opad[i] = byte ^ 0x5c
  }
  const innerInput = new Uint8Array(BLOCK + message.length)
  innerInput.set(ipad)
  innerInput.set(message, BLOCK)
  const inner = sha256(innerInput)
  const outerInput = new Uint8Array(BLOCK + inner.length)
  outerInput.set(opad)
  outerInput.set(inner, BLOCK)
  return sha256(outerInput)
}

/** Constant-time equality — compares every byte so timing cannot leak the prefix. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

// ── base64url + UTF-8 ──────────────────────────────────────────────────────

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function base64Encode(bytes: Uint8Array): string {
  let out = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0
    const has1 = i + 1 < bytes.length
    const has2 = i + 2 < bytes.length
    const b1 = has1 ? (bytes[i + 1] ?? 0) : 0
    const b2 = has2 ? (bytes[i + 2] ?? 0) : 0
    out += B64_CHARS.charAt(b0 >> 2)
    out += B64_CHARS.charAt(((b0 & 0x03) << 4) | (b1 >> 4))
    out += has1 ? B64_CHARS.charAt(((b1 & 0x0f) << 2) | (b2 >> 6)) : "="
    out += has2 ? B64_CHARS.charAt(b2 & 0x3f) : "="
  }
  return out
}

const B64_DECODE = (() => {
  const map = new Uint8Array(256).fill(255)
  for (let i = 0; i < B64_CHARS.length; i++) map[B64_CHARS.charCodeAt(i)] = i
  return map
})()

function base64Decode(s: string): Uint8Array {
  const clean = s.replace(/=+$/g, "")
  const out: number[] = []
  let buf = 0
  let bits = 0
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i)
    const val = code < 256 ? (B64_DECODE[code] ?? 255) : 255
    if (val === 255) throw new Error(`base64Decode: invalid char '${clean.charAt(i)}'`)
    buf = (buf << 6) | val
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buf >> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

/** base64url: swap the URL-unsafe chars and drop padding (the JWT wire encoding). */
function toBase64Url(bytes: Uint8Array): string {
  return base64Encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function fromBase64Url(s: string): Uint8Array {
  return base64Decode(s.replace(/-/g, "+").replace(/_/g, "/"))
}

function utf8Encode(str: string): Uint8Array {
  const out: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) out.push(code)
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6))
      out.push(0x80 | (code & 0x3f))
    } else {
      out.push(0xe0 | (code >> 12))
      out.push(0x80 | ((code >> 6) & 0x3f))
      out.push(0x80 | (code & 0x3f))
    }
  }
  return new Uint8Array(out)
}

function utf8Decode(bytes: Uint8Array): string {
  let out = ""
  let i = 0
  while (i < bytes.length) {
    const b = bytes[i] ?? 0
    if (b < 0x80) {
      out += String.fromCharCode(b)
      i += 1
    } else if (b < 0xe0) {
      const b1 = bytes[i + 1] ?? 0
      out += String.fromCharCode(((b & 0x1f) << 6) | (b1 & 0x3f))
      i += 2
    } else {
      const b1 = bytes[i + 1] ?? 0
      const b2 = bytes[i + 2] ?? 0
      out += String.fromCharCode(((b & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f))
      i += 3
    }
  }
  return out
}

// ── JWT (HS256) ────────────────────────────────────────────────────────────

const JWT_HEADER = '{"alg":"HS256","typ":"JWT"}'

export interface JwtPayload {
  [key: string]: string | number | boolean | null
}

/** Build a base64url JWT `header.payload.signature` signed with HMAC-SHA256(secret). */
export function hmacSign(payload: JwtPayload, secret: string): string {
  const encHeader = toBase64Url(utf8Encode(JWT_HEADER))
  const encPayload = toBase64Url(utf8Encode(JSON.stringify(payload)))
  const signingInput = `${encHeader}.${encPayload}`
  const sig = hmacSha256(utf8Encode(secret), utf8Encode(signingInput))
  return `${signingInput}.${toBase64Url(sig)}`
}

/**
 * Verify a JWT's HMAC-SHA256 signature against `secret`. Returns true only if the
 * token is well-formed and the recomputed signature matches in constant time. This
 * is the cryptographic gate the auth wall checks — a tampered payload or signature
 * (or a token signed with a different secret) fails.
 */
export function hmacVerify(token: string, secret: string): boolean {
  const parts = token.split(".")
  if (parts.length !== 3) return false
  const signingInput = `${parts[0] ?? ""}.${parts[1] ?? ""}`
  const expected = hmacSha256(utf8Encode(secret), utf8Encode(signingInput))
  let actual: Uint8Array
  try {
    actual = fromBase64Url(parts[2] ?? "")
  } catch {
    return false
  }
  return constantTimeEqual(expected, actual)
}

/** Decode (without verifying) a JWT's payload, for inspection only — never a trust signal. */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    return JSON.parse(utf8Decode(fromBase64Url(parts[1] ?? ""))) as JwtPayload
  } catch {
    return null
  }
}

// ── Forging helpers (for the "tampered badge" lesson and the level stream) ──

/** A token validly signed but with the WRONG secret — a badge minted by a foreign city. */
export function forgeWithSecret(payload: JwtPayload, wrongSecret: string): string {
  return hmacSign(payload, wrongSecret)
}

/** Corrupt one character of the signature segment — the badge is physically altered. */
export function tamperSignature(token: string): string {
  const parts = token.split(".")
  if (parts.length !== 3) return token
  const sig = parts[2] ?? ""
  if (sig.length === 0) return token
  // flip the FIRST base64url char: all 6 of its bits are decoded, so the tamper always
  // changes the signature bytes (flipping the LAST char could touch only the 2 discarded
  // padding bits of a 43-char unpadded SHA-256 encoding, leaving verification intact).
  const first = sig.charAt(0)
  const swapped = first === "A" ? "B" : "A"
  return `${parts[0]}.${parts[1]}.${swapped}${sig.slice(1)}`
}

/** Re-encode the payload with a changed field but keep the OLD signature → verification fails. */
export function tamperPayload(token: string, field: string, value: string): string {
  const parts = token.split(".")
  if (parts.length !== 3) return token
  const payload = decodeJwt(token)
  if (!payload) return token
  payload[field] = value
  const encPayload = toBase64Url(utf8Encode(JSON.stringify(payload)))
  return `${parts[0]}.${encPayload}.${parts[2]}`
}
