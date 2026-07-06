import type { Level, LogRecord } from "./pipeline"

export type Rng = () => number

/** Mulberry32 — small deterministic PRNG. Same seed ⇒ same log stream ⇒ replayable attempts. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

const LEVELS: Level[] = ["trace", "debug", "info", "warn", "error", "fatal"]

/**
 * Deterministic stream of structured log records for one tributary (source).
 * `correlationId` is assigned per-record from a small pool so multiple records
 * share an id (the dye spreads across records of one request). Same seed ⇒ same
 * stream ⇒ replayable attempts.
 */
export function logStream(rng: Rng, source: string, count: number): LogRecord[] {
  const out: LogRecord[] = []
  for (let i = 0; i < count; i++) {
    const level = LEVELS[Math.floor(rng() * LEVELS.length) as number] as Level
    // ~1 in 4 records belongs to the same request as a neighbor (shared correlation id)
    const correlationId =
      rng() < 0.25 ? `req-shared-${Math.floor(rng() * 4)}` : `req-${source}-${i}`
    out.push({
      logId: `${source}-${i}`,
      source,
      level,
      message: `${source} log #${i}`,
      correlationId,
      attributes: { i },
    })
  }
  return out
}
