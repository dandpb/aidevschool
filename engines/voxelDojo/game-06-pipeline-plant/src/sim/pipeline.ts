/**
 * PIPELINE PLANT — simulation core.
 *
 * Pure functions modelling the streaming-vs-buffering + bounded-memory concept. ZERO `three` imports.
 * Deterministic: every result is a pure function of its numeric inputs; no `Date.now()`, no RNG
 * inside the math. The seeded RNG (rng.ts) only generates *scenario parameters* (file size,
 * capacity, chunk size), never an upload result. Unit-tested in Vitest with no WebGL.
 */

export type UploadMode = "buffered" | "streaming"

/** Result of any upload variant. `peakMem` is the invariant the lesson turns on. */
export interface UploadResult {
  /** bytes that reached the destination */
  delivered: number
  /** bytes lost to capacity overflow (0 for a healthy stream) */
  overflowed: number
  /** peak memory footprint in bytes — = size (buffered) or = chunkSize (streamed) */
  peakMem: number
  mode: UploadMode
}

/**
 * Buffered upload: slurp the whole `size` into memory, then deliver.
 *
 * - peakMem = size (memory scales with the file — the unbounded case).
 * - overflows iff `size > capacity`: the tank fills to the rim and the rest spills.
 * - delivered = min(size, capacity); overflowed = max(0, size - capacity).
 */
export function bufferedUpload(size: number, capacity: number): UploadResult {
  if (size < 0) throw new Error("size must be >= 0")
  if (capacity < 0) throw new Error("capacity must be >= 0")
  const overflowed = Math.max(0, size - capacity)
  const delivered = Math.min(size, capacity)
  return { delivered, overflowed, peakMem: size, mode: "buffered" }
}

/**
 * Streaming upload: pump fixed-size chunks one at a time.
 *
 * - peakMem = chunkSize (memory bounded by the chunk — INDEPENDENT of total size). This is the
 *   load-bearing invariant: the same chunk keeps the level flat whether the file is 100 or 1000000.
 * - never overflows as long as `chunkSize <= capacity`; delivered = size (the whole file gets through).
 * - if a rogue chunk exceeds capacity, that chunk spills: delivered = floor(size/chunkSize)*chunkSize
 *   + min(remainder, capacity), and overflowed is the rest. (In practice L3 forbids this; modelled
 *   for completeness so the boundary is honest.)
 */
export function streamingUpload(size: number, chunkSize: number, capacity: number): UploadResult {
  if (size < 0) throw new Error("size must be >= 0")
  if (chunkSize <= 0) throw new Error("chunkSize must be > 0")
  if (capacity < 0) throw new Error("capacity must be >= 0")
  const fullChunks = Math.floor(size / chunkSize)
  const remainder = size - fullChunks * chunkSize
  // Each full chunk is bounded by min(chunkSize, capacity); the remainder too.
  const perChunkDelivered = Math.min(chunkSize, capacity)
  const remainderDelivered = Math.min(remainder, capacity)
  const delivered = fullChunks * perChunkDelivered + remainderDelivered
  const overflowed = Math.max(0, size - delivered)
  return { delivered, overflowed, peakMem: chunkSize, mode: "streaming" }
}

/**
 * Buffered upload under a slow drain (backpressure). Over a fixed `timeMs` window the drain can only
 * clear `drainRate * timeMs` bytes out the bottom. The buffer tank holds `capacity` at once. So:
 * - `drained` = min(size, drainable) — what actually exited the bottom of the tank.
 * - bytes that entered but did not yet drain sit in the tank (up to `capacity`); bytes beyond what
 *   the tank + drain could absorb together **overflow** (spill).
 * - **stall** = drained < size but overflowed == 0: the drain could not keep up, so the tank is
 *   holding the backlog, but nothing was lost. **overflow** = some bytes never even fit the tank.
 *
 * Returns a richer result so L4 can distinguish stall (slow but safe) from overflow (data lost).
 */
export interface BackpressuredResult extends UploadResult {
  /** bytes the drain actually cleared out the bottom of the tank */
  drained: number
  /** true when the drain couldn't keep up — drained < size but nothing overflowed */
  stalled: boolean
}

export function bufferedUploadBackpressured(
  size: number,
  capacity: number,
  drainRate: number,
  timeMs: number,
): BackpressuredResult {
  if (size < 0) throw new Error("size must be >= 0")
  if (capacity < 0) throw new Error("capacity must be >= 0")
  if (drainRate < 0) throw new Error("drainRate must be >= 0")
  if (timeMs < 0) throw new Error("timeMs must be >= 0")
  const drainable = drainRate * timeMs // total bytes the drain can clear in the window
  const drained = Math.min(size, drainable) // what exited the bottom
  // The tank absorbs the backlog the drain hasn't cleared, up to `capacity`. Anything beyond that
  // never fit and overflowed.
  const backlog = size - drained
  const heldInTank = Math.min(backlog, capacity)
  const overflowed = Math.max(0, backlog - capacity)
  // `delivered` = drained + heldInTank counts bytes that are safely inside the system (drained out
  // or buffered, not lost). For the backpressure lesson the meaningful "delivered downstream" is the
  // drained volume; we report delivered = drained + heldInTank so total accounting is honest.
  const delivered = drained + heldInTank
  const stalled = overflowed === 0 && drained < size
  return {
    delivered,
    drained,
    overflowed,
    peakMem: size,
    mode: "buffered",
    stalled,
  }
}

/**
 * Throughput: delivered bytes per millisecond. Lets buffer vs stream be compared on a fair clock —
 * the same `delivered` over the same `timeMs` is the same throughput, regardless of peak memory.
 */
export function throughput(result: UploadResult, timeMs: number): number {
  if (timeMs <= 0) throw new Error("timeMs must be > 0")
  return result.delivered / timeMs
}

/** Convenience: does a buffered upload overflow its capacity? */
export function bufferedOverflows(size: number, capacity: number): boolean {
  return size > capacity
}

/** Convenience: peak-memory ratio (peakMem / capacity). > 1 means the tank crested the rim. */
export function peakRatio(result: UploadResult, capacity: number): number {
  if (capacity <= 0) throw new Error("capacity must be > 0")
  return result.peakMem / capacity
}
