// Slug Launcher — core short-code engine (pure, framework-free).
//
// The 3D scene is a thin projection of this state machine; the truth lives
// here. One game = one concept: encode a long URL to a short base62 code,
// detect collisions, retry within the spec's 5-attempt budget (RF-011), or
// switch strategy. The three ID strategies (AUTO / HASH / SNOWFLAKE) map to
// the curriculum's key question: how do strategies compare on collision
// resistance vs throughput?
//
// This module is fully synchronous and deterministic (the in-game HASH uses
// FNV-1a 32-bit + base62 so retries are reproducible; SHA-256 truncation is
// the same encode-truncate logic with a stronger hash primitive).

// 62 symbols: 0-9, A-Z, a-z. The base62 alphabet every URL shortener uses.
export const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" as const

export const DEFAULT_CODE_WIDTH = 4
export const RF011_MAX_RETRIES = 5

export type Strategy = "auto" | "hash" | "snowflake"

export type CrateSpec = {
  readonly id: number
  readonly url: string
}

export type DockEntry = {
  readonly code: string
  readonly url: string
  readonly strategy: Strategy
}

export type WaveConfig = {
  readonly crates: readonly CrateSpec[]
  readonly maxRetries: number
  readonly codeWidth: number
}

export type FireOutcome =
  | { readonly kind: "docked"; readonly code: string; readonly salt: number }
  | { readonly kind: "collision"; readonly code: string; readonly salt: number }

export type RetryOutcome =
  | { readonly kind: "docked"; readonly code: string; readonly salt: number }
  | { readonly kind: "collision"; readonly code: string; readonly salt: number }
  | { readonly kind: "exhausted"; readonly salt: number }
  | { readonly kind: "noop"; readonly salt: number }

export type WaveResult = {
  readonly codesAssigned: number
  readonly collisionsDetected: number
  readonly collisionsRetriedOk: number
  readonly retriesExhausted: number
  readonly dockOverflows: number
  readonly strategiesUsed: readonly Strategy[]
  readonly waveTarget: number
  readonly waveCleared: boolean
}

// Encode a non-negative integer to a base62 string left-padded to `width`.
// Pure: same input -> same output, no I/O. Used by every strategy.
export function encodeBase62(value: number, width = DEFAULT_CODE_WIDTH): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`base62 expects a non-negative integer, got ${value}`)
  }
  if (width < 1) throw new Error("width must be >= 1")
  let n = value
  let out = ""
  do {
    const ch = BASE62_ALPHABET[n % 62]
    out = `${ch ?? BASE62_ALPHABET[0]}${out}`
    n = Math.floor(n / 62)
  } while (n > 0)
  while (out.length < width) out = `${BASE62_ALPHABET[0]}${out}`
  return out.slice(-width)
}

// FNV-1a 32-bit hash. Synchronous, deterministic analog of SHA-256 truncation:
// URL (+ optional salt) -> uint32 -> base62. The pedagogy is the encode +
// truncate step; using FNV-1a keeps the game fully deterministic and replayable.
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// Deterministic HASH strategy: same URL (+ same salt) -> same code.
// Collisions happen exactly when the same URL is fired twice with the same
// salt — the teachable property of deterministic ID assignment.
export function hashTruncate(url: string, salt = 0, width = DEFAULT_CODE_WIDTH): string {
  return encodeBase62(fnv1a32(`${url}#${salt}`), width)
}

// AUTO strategy: sequential counter. Collision-free, but leaks count and is
// trivially guessable. Capped to one-per-fire (throughput ceiling).
export function autoIncrement(counter: number, width = DEFAULT_CODE_WIDTH): string {
  return encodeBase62(counter, width)
}

// SNOWFLAKE strategy: high bits = time shard, low bits = node-unique body.
// Near-zero collision under load (the catalog's answer to "what scales").
export function snowflake(now: number, body: number, width = DEFAULT_CODE_WIDTH): string {
  const ts = now & 0xffff
  const rand = body & 0xffff
  return encodeBase62(((ts << 16) | rand) >>> 0, width)
}

// Pure score computation: given a wave result, decide whether the attempt
// clears the gate. The `collisionsDetected >= 1` clause is load-bearing —
// a lucky collision-free seed does NOT pass; the player must demonstrate the
// retry loop at least once.
export function isWavePass(result: WaveResult): boolean {
  return (
    result.waveCleared &&
    result.codesAssigned >= result.waveTarget &&
    result.retriesExhausted === 0 &&
    result.dockOverflows === 0 &&
    result.collisionsDetected >= 1 &&
    result.collisionsRetriedOk === result.collisionsDetected
  )
}

// The wave engine: holds the dock table, the strategy record, and the
// per-crate retry budget. The 3D scene calls `fire` and `retry` and reads
// `result()` to render the stats tower; this class owns the gate math.
export class WaveEngine {
  private readonly docks = new Map<string, DockEntry>()
  private readonly strategies = new Set<Strategy>()
  private assigned = 0
  private detected = 0
  private retriedOk = 0
  private exhausted = 0
  private overflows = 0
  private autoCounter = 0

  constructor(private readonly config: WaveConfig) {}

  get codeWidth(): number {
    return this.config.codeWidth
  }

  get maxRetries(): number {
    return this.config.maxRetries
  }

  get waveTarget(): number {
    return this.config.crates.length
  }

  get waveCrates(): readonly CrateSpec[] {
    return this.config.crates
  }

  get codesAssigned(): number {
    return this.assigned
  }

  // Preview the code a crate WOULD get if fired right now. Does not mutate.
  // Used by the scene to spin the cannon ring to the chosen cells.
  previewCode(url: string, strategy: Strategy, salt = 0, now = Date.now()): string {
    if (strategy === "auto") return autoIncrement(this.autoCounter, this.config.codeWidth)
    if (strategy === "hash") return hashTruncate(url, salt, this.config.codeWidth)
    return snowflake(now, Math.floor(Math.random() * 0x10000), this.config.codeWidth)
  }

  // Fire on the active crate. Outcome is either docked (assigned++) or
  // collision (detected++, dock unchanged). On dock under AUTO, the counter
  // advances — the throughput ceiling is one dock per fire.
  fire(url: string, strategy: Strategy, salt = 0, now = Date.now()): FireOutcome {
    this.strategies.add(strategy)
    const code =
      strategy === "auto"
        ? autoIncrement(this.autoCounter, this.config.codeWidth)
        : strategy === "hash"
          ? hashTruncate(url, salt, this.config.codeWidth)
          : snowflake(now, Math.floor(Math.random() * 0x10000), this.config.codeWidth)

    if (!this.docks.has(code)) {
      this.docks.set(code, { code, url, strategy })
      if (strategy === "auto") this.autoCounter += 1
      this.assigned += 1
      return { kind: "docked", code, salt }
    }
    this.detected += 1
    return { kind: "collision", code, salt }
  }

  // Retry on collision: bump salt, re-encode. If new code is free, dock and
  // count as recovered. If salt exceeds the budget, the crate is lost
  // (exhausted + overflow). AUTO can't collide, so retry is a noop.
  retry(
    url: string,
    strategy: Strategy,
    salt: number,
    now = Date.now(),
    body = Math.floor(Math.random() * 0x10000),
  ): RetryOutcome {
    if (strategy === "auto") return { kind: "noop", salt }

    const nextSalt = salt + 1
    if (nextSalt > this.config.maxRetries) {
      this.exhausted += 1
      this.overflows += 1
      return { kind: "exhausted", salt: nextSalt }
    }

    const code =
      strategy === "hash"
        ? hashTruncate(url, nextSalt, this.config.codeWidth)
        : snowflake(now + nextSalt * 1000, body + nextSalt, this.config.codeWidth)

    if (!this.docks.has(code)) {
      this.docks.set(code, { code, url, strategy })
      this.assigned += 1
      this.retriedOk += 1
      return { kind: "docked", code, salt: nextSalt }
    }
    this.detected += 1
    return { kind: "collision", code, salt: nextSalt }
  }

  isWaveCleared(): boolean {
    return this.assigned >= this.config.crates.length
  }

  dockList(): readonly DockEntry[] {
    return [...this.docks.values()]
  }

  result(): WaveResult {
    return {
      codesAssigned: this.assigned,
      collisionsDetected: this.detected,
      collisionsRetriedOk: this.retriedOk,
      retriesExhausted: this.exhausted,
      dockOverflows: this.overflows,
      strategiesUsed: [...this.strategies].sort(),
      waveTarget: this.config.crates.length,
      waveCleared: this.isWaveCleared(),
    }
  }
}

// Build a wave spec: N crates with controlled duplication so HASH collides
// predictably. Two pairs of duplicate URLs guarantee at least one collision
// under HASH (the gate requires it). `seedCrates` lets tests pin the wave.
export function buildDefaultWave(
  size = 4,
  urls: readonly string[] = [
    "https://example.com/long/path/alpha",
    "https://example.com/long/path/alpha",
    "https://example.com/long/path/beta",
    "https://example.com/long/path/beta",
  ],
): readonly CrateSpec[] {
  const list: CrateSpec[] = []
  for (let i = 0; i < size; i += 1) {
    const url = urls[i % urls.length]
    if (url === undefined) continue
    list.push({ id: i, url })
  }
  return list
}
