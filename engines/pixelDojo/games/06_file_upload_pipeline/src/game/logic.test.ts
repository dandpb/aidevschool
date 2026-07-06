import { describe, expect, it } from "vitest"
import {
  aimCannon,
  BUFFER_CAPACITY,
  BYTES_PER_CHUNK,
  CHUNKS_PER_FILE,
  cancelUpload,
  canSlice,
  chunkHash,
  computeMetrics,
  computeTargetHash,
  createInitialState,
  FILES_TARGET,
  PIPELINE_DURATION_MS,
  rejectSizeExceeded,
  sliceChunk,
  swallowWhole,
  tick,
} from "./logic"

const FIRE_CAP_MS = 150 // mirror of constant in logic.ts (not exported)

describe("createInitialState", () => {
  it("starts playing with an empty bounded buffer and the first file ready", () => {
    const s = createInitialState()
    expect(s.status).toBe("playing")
    expect(s.buffer).toEqual([])
    expect(s.bufferCapacity).toBe(BUFFER_CAPACITY)
    expect(s.bufferPeak).toBe(0)
    expect(s.filesCompleted).toBe(0)
    expect(s.filesTarget).toBe(FILES_TARGET)
    expect(s.currentFile?.id).toBe(0)
    expect(s.currentFile?.totalChunks).toBe(CHUNKS_PER_FILE)
    expect(s.failReason).toBeNull()
  })

  it("computes a non-empty target hash covering every expected chunk", () => {
    const s = createInitialState()
    expect(s.hasherTarget.length).toBe(FILES_TARGET * CHUNKS_PER_FILE * 2)
    expect(s.hasherAccumulator).toBe("")
  })
})

describe("chunkHash + computeTargetHash", () => {
  it("produces the same per-chunk fingerprint the accumulator will build", () => {
    let acc = ""
    for (let id = 0; id < FILES_TARGET * CHUNKS_PER_FILE; id += 1) {
      acc += (id % 256).toString(16).padStart(2, "0")
    }
    expect(acc).toBe(computeTargetHash())
    expect(
      chunkHash({ id: 0, fileId: 0, ordinal: 0, bytes: 1, validMime: true, sizeLegal: true }),
    ).toBe("00")
  })
})

describe("sliceChunk — bounded memory", () => {
  it("slices one chunk off the current file into the buffer", () => {
    const s0 = createInitialState()
    const s1 = sliceChunk(s0, 1000)
    expect(s1.buffer).toHaveLength(1)
    expect(s1.currentFile?.chunksSliced).toBe(1)
    expect(s1.bufferPeak).toBe(1)
    expect(s1.nextChunkId).toBe(1)
    expect(s1.lastSliceAtMs).toBe(1000)
  })

  it("respects the fire-rate cap (rapid presses do nothing)", () => {
    const s0 = createInitialState()
    const s1 = sliceChunk(s0, 1000)
    const s2 = sliceChunk(s1, 1000 + FIRE_CAP_MS - 1)
    expect(s2).toBe(s1) // no-op
    const s3 = sliceChunk(s1, 1000 + FIRE_CAP_MS + 1)
    expect(s3.buffer).toHaveLength(2)
  })

  it("overflows + fails the run when buffer is at capacity", () => {
    let s = createInitialState()
    // Fill buffer up to capacity (chunks won't drain because we don't tick).
    for (let i = 0; i < BUFFER_CAPACITY; i += 1) {
      s = sliceChunk(s, i * (FIRE_CAP_MS + 1))
    }
    expect(s.buffer).toHaveLength(BUFFER_CAPACITY)
    expect(s.status).toBe("playing")
    // One more slice overflows.
    const overflow = sliceChunk(s, BUFFER_CAPACITY * (FIRE_CAP_MS + 1) + 10)
    expect(overflow.bufferOverflows).toBe(1)
    expect(overflow.status).toBe("lost")
    expect(overflow.failReason).toBe("buffer_overflow")
  })

  it("refuses to slice once the file is fully sliced", () => {
    const s0 = createInitialState()
    const file = s0.currentFile
    expect(file).not.toBeNull()
    if (file === null) return
    // Force the current file into the "fully sliced" state without going
    // through the pipeline (file does not advance because processor/buffer
    // are untouched here — we only mutate chunksSliced for the predicate).
    const exhausted = {
      ...s0,
      currentFile: { ...file, chunksSliced: file.totalChunks },
    }
    expect(canSlice(exhausted, 99999)).toBe(false)
    const extra = sliceChunk(exhausted, 99999)
    expect(extra).toBe(exhausted) // no-op
  })
})

describe("tick — pipeline drains the buffer", () => {
  it("pulls one chunk from the buffer into the processor", () => {
    let s = createInitialState()
    s = sliceChunk(s, 100)
    expect(s.buffer).toHaveLength(1)
    s = tick(s, 10)
    expect(s.buffer).toHaveLength(0)
    expect(s.processor).not.toBeNull()
  })

  it("completes a chunk after PIPELINE_DURATION_MS and accumulates its fingerprint", () => {
    let s = createInitialState()
    s = sliceChunk(s, 100)
    s = tick(s, 10) // enter processor
    s = tick(s, PIPELINE_DURATION_MS) // complete
    expect(s.processor).toBeNull()
    expect(s.bytesStreamed).toBe(BYTES_PER_CHUNK)
    expect(s.hasherChunksConsumed).toBe(1)
    expect(s.hasherAccumulator).toBe("00")
  })

  it("drains at 1 chunk per PIPELINE_DURATION_MS (backpressure)", () => {
    let s = createInitialState()
    // Push 3 chunks (within capacity)
    for (let i = 0; i < 3; i += 1) {
      s = sliceChunk(s, i * (FIRE_CAP_MS + 1))
    }
    // One tick pulls one into the processor; 2 remain buffered.
    s = tick(s, 5)
    expect(s.buffer).toHaveLength(2)
    expect(s.processor).not.toBeNull()
  })
})

describe("cancelUpload", () => {
  it("sweeps the buffer and in-flight chunk, increments cancellation counter", () => {
    let s = createInitialState()
    s = sliceChunk(s, 100) // buffer=[0]
    s = sliceChunk(s, 100 + FIRE_CAP_MS + 1) // buffer=[0,1]
    s = tick(s, 5) // processor pulls chunk 0, buffer=[1]
    s = sliceChunk(s, 100 + 2 * (FIRE_CAP_MS + 1)) // buffer=[1,2]
    expect(s.buffer).toHaveLength(2)
    expect(s.processor).not.toBeNull()
    const cancelled = cancelUpload(s)
    expect(cancelled.buffer).toHaveLength(0)
    expect(cancelled.processor).toBeNull()
    expect(cancelled.cancellations).toBe(1)
  })
})

describe("swallowWhole (X trap)", () => {
  it("instantly fails the run (whole-file buffering violates bounded-memory)", () => {
    const s = createInitialState()
    const trapped = swallowWhole(s)
    expect(trapped.status).toBe("lost")
    expect(trapped.failReason).toBe("whole_file_trap")
    expect(trapped.wholeFileTrapUsed).toBe(true)
  })
})

describe("rejectSizeExceeded", () => {
  it("is a safe no-op when the active file is within the 1 GiB cap", () => {
    const s = createInitialState()
    expect(s.currentFile?.sizeLegal).toBe(true)
    const rejected = rejectSizeExceeded(s)
    expect(rejected).toBe(s)
  })
})

describe("aimCannon", () => {
  it("moves and clamps the cannon angle (cosmetic)", () => {
    let s = createInitialState()
    s = aimCannon(s, 40)
    expect(s.cannonAngleDeg).toBe(30) // clamped
    s = aimCannon(s, -100)
    expect(s.cannonAngleDeg).toBe(-30)
  })
})

describe("full wave win path", () => {
  it("wins the wave when all chunks are streamed with peak < capacity", () => {
    let s = createInitialState()
    // Pace slices slower than the pipeline drain so the buffer never overflows.
    // Each file gets CHUNKS_PER_FILE slice+tick pairs plus one extra tick to
    // flush the last in-flight chunk and advance the file.
    let now = 1000
    for (let file = 0; file < FILES_TARGET; file += 1) {
      for (let c = 0; c < CHUNKS_PER_FILE; c += 1) {
        s = sliceChunk(s, now)
        s = tick(s, PIPELINE_DURATION_MS + 10)
        now += PIPELINE_DURATION_MS + 10
      }
      // Flush the last in-flight chunk so the file can advance.
      s = tick(s, PIPELINE_DURATION_MS + 10)
      now += PIPELINE_DURATION_MS + 10
    }

    expect(s.status).toBe("won")
    expect(s.bufferOverflows).toBe(0)
    expect(s.wholeFileTrapUsed).toBe(false)
    expect(s.invalidChunksLeaked).toBe(0)
    expect(s.sizeCapViolations).toBe(0)
    expect(s.filesCompleted).toBe(FILES_TARGET)
    expect(s.hasherAccumulator).toBe(s.hasherTarget)
    expect(s.bufferPeak).toBeLessThanOrEqual(BUFFER_CAPACITY)

    const metrics = computeMetrics(s)
    expect(metrics.files_completed).toBe(FILES_TARGET)
    expect(metrics.files_target).toBe(FILES_TARGET)
    expect(metrics.buffer_overflows).toBe(0)
    expect(metrics.hasher_match).toBe(true)
    expect(metrics.bytes_streamed).toBe(FILES_TARGET * CHUNKS_PER_FILE * BYTES_PER_CHUNK)
  })
})

describe("full wave fail path (overflow)", () => {
  it("loses when the player pushes faster than the pipeline can drain", () => {
    let s = createInitialState()
    // Spam slices without ticking the drain.
    for (let i = 0; i < BUFFER_CAPACITY + 1; i += 1) {
      s = sliceChunk(s, i * (FIRE_CAP_MS + 1))
      if (s.status === "lost") break
    }
    expect(s.status).toBe("lost")
    expect(s.failReason).toBe("buffer_overflow")
    const metrics = computeMetrics(s)
    expect(metrics.buffer_overflows).toBe(1)
  })
})
