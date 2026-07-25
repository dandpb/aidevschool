import type { Level, LogRecord } from "./pipeline"

export { mulberry32, type Rng } from "../../../shared/rng"

import type { Rng } from "../../../shared/rng"

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
