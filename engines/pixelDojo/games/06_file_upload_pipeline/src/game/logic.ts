// Byte Stream Reactor — pure game logic for the streaming-I/O + bounded-memory
// teaching game (project 06_file_upload_pipeline). All functions here are pure
// (state in, state out) so they can be unit-tested headlessly and shared
// between the three.js scene and the Playwright smoke run.
//
// THE ONE CONCEPT: process a large file as a sequence of fixed-size chunks
// flowing through a small fixed-capacity buffer, never by loading the whole
// file at once. Backpressure must be respected.

// --- Tunable constants -------------------------------------------------------

export const BUFFER_CAPACITY = 4
export const FILES_TARGET = 5
export const CHUNKS_PER_FILE = 5
export const BYTES_PER_CHUNK = 100 * 1024 * 1024 // 100 MiB → 500 MiB / file < 1 GiB cap
export const ONE_GIB = 1024 * 1024 * 1024
export const FILE_BYTES = CHUNKS_PER_FILE * BYTES_PER_CHUNK
export const PIPELINE_DURATION_MS = 500 // drain rate: 1 chunk per 500ms
export const FIRE_CAP_MS = 150 // anti-keyspam cooldown between slices

// --- Core types --------------------------------------------------------------

export type GameStatus = "playing" | "won" | "lost"

export type Chunk = {
  readonly id: number
  readonly fileId: number
  readonly ordinal: number
  readonly bytes: number
  readonly validMime: boolean
  readonly sizeLegal: boolean
}

export type FileBlock = {
  readonly id: number
  readonly totalChunks: number
  readonly bytesPerChunk: number
  readonly chunksSliced: number
  readonly sizeLegal: boolean
}

export type ProcessorSlot = { readonly chunk: Chunk; readonly remainingMs: number } | null

export type FailReason =
  | "buffer_overflow"
  | "whole_file_trap"
  | "invalid_mime_leak"
  | "size_cap_violation"
  | "hasher_mismatch"
  | null

export type GameState = {
  readonly status: GameStatus
  readonly filesCompleted: number
  readonly filesTarget: number
  readonly currentFile: FileBlock | null
  readonly buffer: readonly Chunk[]
  readonly bufferCapacity: number
  readonly bufferPeak: number
  readonly bufferOverflows: number
  readonly wholeFileTrapUsed: boolean
  readonly invalidChunksLeaked: number
  readonly sizeCapViolations: number
  readonly cancellations: number
  readonly bytesStreamed: number
  readonly hasherAccumulator: string
  readonly hasherTarget: string
  readonly hasherChunksConsumed: number
  readonly processor: ProcessorSlot
  readonly lastSliceAtMs: number
  readonly failReason: FailReason
  readonly nextChunkId: number
  readonly elapsedMs: number
  readonly cannonAngleDeg: number
}

// --- Factory -----------------------------------------------------------------

export function makeFile(id: number): FileBlock {
  return {
    id,
    totalChunks: CHUNKS_PER_FILE,
    bytesPerChunk: BYTES_PER_CHUNK,
    chunksSliced: 0,
    sizeLegal: FILE_BYTES <= ONE_GIB,
  }
}

export function createInitialState(nowMs = 0): GameState {
  return {
    status: "playing",
    filesCompleted: 0,
    filesTarget: FILES_TARGET,
    currentFile: makeFile(0),
    buffer: [],
    bufferCapacity: BUFFER_CAPACITY,
    bufferPeak: 0,
    bufferOverflows: 0,
    wholeFileTrapUsed: false,
    invalidChunksLeaked: 0,
    sizeCapViolations: 0,
    cancellations: 0,
    bytesStreamed: 0,
    hasherAccumulator: "",
    hasherTarget: computeTargetHash(),
    hasherChunksConsumed: 0,
    processor: null,
    lastSliceAtMs: -FIRE_CAP_MS,
    failReason: null,
    nextChunkId: 0,
    elapsedMs: nowMs,
    cannonAngleDeg: 0,
  }
}

// --- Hashing -----------------------------------------------------------------

// Deterministic per-chunk fingerprint: 2 lowercase hex chars from chunk id.
// The accumulator grows as chunks complete the pipeline; the target is the
// same computation over all expected chunk ids in order. Any dropped, leaked,
// or reordered chunk makes accumulator diverge from target → mismatch fail.
export function chunkHash(chunk: Chunk): string {
  return (chunk.id % 256).toString(16).padStart(2, "0")
}

export function computeTargetHash(): string {
  let hash = ""
  for (let id = 0; id < FILES_TARGET * CHUNKS_PER_FILE; id += 1) {
    hash += (id % 256).toString(16).padStart(2, "0")
  }
  return hash
}

export function hasherMatch(state: GameState): boolean {
  return state.hasherAccumulator === state.hasherTarget
}

// --- Action predicates -------------------------------------------------------

export function canSlice(state: GameState, nowMs: number): boolean {
  if (state.status !== "playing") return false
  if (state.currentFile === null) return false
  if (state.currentFile.chunksSliced >= state.currentFile.totalChunks) return false
  if (nowMs - state.lastSliceAtMs < FIRE_CAP_MS) return false
  return true
}

// --- Actions -----------------------------------------------------------------

// SPACE — slice + launch one fixed-size chunk through the memory buffer.
// If the buffer is at capacity when the slice lands, the buffer overflows:
// the most direct readout of unbounded push against a bounded-memory contract.
export function sliceChunk(state: GameState, nowMs: number): GameState {
  if (!canSlice(state, nowMs)) return state
  const file = state.currentFile
  if (file === null) return state
  const chunk: Chunk = {
    id: state.nextChunkId,
    fileId: file.id,
    ordinal: file.chunksSliced,
    bytes: file.bytesPerChunk,
    validMime: true,
    sizeLegal: file.sizeLegal,
  }
  if (state.buffer.length >= state.bufferCapacity) {
    return finalizeLoss(
      {
        ...state,
        bufferOverflows: state.bufferOverflows + 1,
        lastSliceAtMs: nowMs,
      },
      "buffer_overflow",
    )
  }
  const buffer = [...state.buffer, chunk]
  const updatedFile: FileBlock = { ...file, chunksSliced: file.chunksSliced + 1 }
  return {
    ...state,
    currentFile: updatedFile,
    buffer,
    bufferPeak: Math.max(state.bufferPeak, buffer.length),
    lastSliceAtMs: nowMs,
    nextChunkId: state.nextChunkId + 1,
  }
}

// X — TRAP button: "swallow whole file" anti-pattern. Always overflows the
// bounded buffer instantly. Taught once, fails the run if used.
export function swallowWhole(state: GameState): GameState {
  if (state.status !== "playing") return state
  return finalizeLoss({ ...state, wholeFileTrapUsed: true }, "whole_file_trap")
}

// C — cancel active upload: sweep in-flight chunks, clear the buffer.
// The cancellation path — important for production upload pipelines.
export function cancelUpload(state: GameState): GameState {
  if (state.status !== "playing") return state
  return {
    ...state,
    buffer: [],
    processor: null,
    cancellations: state.cancellations + 1,
  }
}

// V — reject size-exceeded chunk. In the canonical wave every file is below
// the 1 GiB cap, so this is a no-op safety valve (using it on a legal chunk
// just drops the run because the file then never completes). Recorded as a
// benign reject only when the active file actually exceeds the cap.
export function rejectSizeExceeded(state: GameState): GameState {
  if (state.status !== "playing") return state
  const file = state.currentFile
  if (file === null) return state
  if (file.sizeLegal) {
    // Rejecting a legal file is a player mistake but not a contract violation;
    // the run simply cannot complete (file never finishes). No-op here.
    return state
  }
  // Oversize file rejected correctly — sweep the in-flight state, advance.
  return {
    ...state,
    buffer: [],
    processor: null,
    filesCompleted: state.filesCompleted + 1,
    currentFile: state.filesCompleted + 1 >= state.filesTarget ? null : makeFile(file.id + 1),
  }
}

// Cannon aim (purely cosmetic: visualizes where chunks land in the buffer).
export function aimCannon(state: GameState, deltaDeg: number): GameState {
  if (state.status !== "playing") return state
  const next = state.cannonAngleDeg + deltaDeg
  const clamped = Math.max(-30, Math.min(30, next))
  return { ...state, cannonAngleDeg: clamped }
}

// --- Pipeline tick -----------------------------------------------------------

// Advance the pipeline by dtMs. The single processor slot drains the buffer
// at 1 chunk per PIPELINE_DURATION_MS. Each completed chunk increments the
// hasher accumulator and bytes-streamed counter.
export function tick(state: GameState, dtMs: number): GameState {
  if (state.status !== "playing") return state
  if (dtMs <= 0) return state

  let processor = state.processor
  let buffer = state.buffer
  let bytesStreamed = state.bytesStreamed
  let hasherAccumulator = state.hasherAccumulator
  let hasherChunksConsumed = state.hasherChunksConsumed
  let invalidLeaked = state.invalidChunksLeaked
  let sizeViolations = state.sizeCapViolations

  // Advance processor; on completion, accumulate chunk fingerprint + bytes.
  if (processor !== null) {
    const remaining = processor.remainingMs - dtMs
    if (remaining > 0) {
      processor = { chunk: processor.chunk, remainingMs: remaining }
    } else {
      const chunk = processor.chunk
      bytesStreamed += chunk.bytes
      hasherAccumulator += chunkHash(chunk)
      hasherChunksConsumed += 1
      if (!chunk.validMime) invalidLeaked += 1
      if (!chunk.sizeLegal) sizeViolations += 1
      processor = null
    }
  }

  // Pull next chunk from buffer (FIFO).
  if (processor === null && buffer.length > 0) {
    const next = buffer[0]
    if (next !== undefined) {
      buffer = buffer.slice(1)
      processor = { chunk: next, remainingMs: PIPELINE_DURATION_MS }
    }
  }

  const stepped: GameState = {
    ...state,
    processor,
    buffer,
    bytesStreamed,
    hasherAccumulator,
    hasherChunksConsumed,
    invalidChunksLeaked: invalidLeaked,
    sizeCapViolations: sizeViolations,
    elapsedMs: state.elapsedMs + dtMs,
  }

  return maybeAdvanceFile(stepped)
}

// A file is "done" once all its chunks have been sliced AND fully drained
// from the buffer + processor. When the last file completes, the wave ends.
function maybeAdvanceFile(state: GameState): GameState {
  const file = state.currentFile
  if (file === null) return state
  const fullySliced = file.chunksSliced >= file.totalChunks
  const fullyDrained = state.buffer.length === 0 && state.processor === null
  if (!fullySliced || !fullyDrained) return state

  const completed = state.filesCompleted + 1
  const advanced: GameState = {
    ...state,
    filesCompleted: completed,
    currentFile: completed >= state.filesTarget ? null : makeFile(file.id + 1),
  }
  if (completed >= state.filesTarget) {
    return finalizeWave(advanced)
  }
  return advanced
}

// End-of-wave pass/fail gate. Direct readout of streaming-with-bounded-memory
// discipline: pass requires 0 overflows, no whole-file trap, no invalid-MIME
// leak, no size-cap violation, and hasher accumulator matching the target.
export function finalizeWave(state: GameState): GameState {
  if (state.status !== "playing") return state
  const match = hasherMatch(state)
  if (
    state.bufferOverflows === 0 &&
    !state.wholeFileTrapUsed &&
    state.invalidChunksLeaked === 0 &&
    state.sizeCapViolations === 0 &&
    match &&
    state.filesCompleted === state.filesTarget
  ) {
    return { ...state, status: "won", failReason: null }
  }
  return { ...state, status: "lost", failReason: match ? null : "hasher_mismatch" }
}

function finalizeLoss(state: GameState, reason: Exclude<FailReason, null>): GameState {
  return { ...state, status: "lost", failReason: reason }
}

// --- Derived metrics for evidence -------------------------------------------

export type WaveMetrics = {
  readonly files_completed: number
  readonly files_target: number
  readonly bytes_streamed: number
  readonly buffer_capacity_chunks: number
  readonly buffer_peak_chunks: number
  readonly buffer_overflows: number
  readonly whole_file_trap_used: boolean
  readonly invalid_chunks_leaked: number
  readonly size_cap_violations: number
  readonly hasher_match: boolean
  readonly cancellations: number
  readonly throughput_mbps: number
}

export function computeMetrics(state: GameState): WaveMetrics {
  const seconds = state.elapsedMs / 1000
  const mb = state.bytesStreamed / (1024 * 1024)
  const throughput = seconds > 0 ? mb / seconds : 0
  return {
    files_completed: state.filesCompleted,
    files_target: state.filesTarget,
    bytes_streamed: state.bytesStreamed,
    buffer_capacity_chunks: state.bufferCapacity,
    buffer_peak_chunks: state.bufferPeak,
    buffer_overflows: state.bufferOverflows,
    whole_file_trap_used: state.wholeFileTrapUsed,
    invalid_chunks_leaked: state.invalidChunksLeaked,
    size_cap_violations: state.sizeCapViolations,
    hasher_match: hasherMatch(state),
    cancellations: state.cancellations,
    throughput_mbps: Number(throughput.toFixed(2)),
  }
}
