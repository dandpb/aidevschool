import { describe, expect, it } from "vitest"
import {
  bufferedOverflows,
  bufferedUpload,
  bufferedUploadBackpressured,
  peakRatio,
  streamingUpload,
  throughput,
} from "./pipeline"
import { intInRange, mulberry32 } from "./rng"

describe("buffered upload (peakMem scales with size)", () => {
  it("delivers the whole file and never overflows when size <= capacity", () => {
    const r = bufferedUpload(80, 100)
    expect(r.delivered).toBe(80)
    expect(r.overflowed).toBe(0)
    expect(r.peakMem).toBe(80)
    expect(r.mode).toBe("buffered")
  })

  it("overflows exactly size - capacity and caps delivered at capacity when size > capacity", () => {
    const r = bufferedUpload(120, 100)
    expect(r.overflowed).toBe(20)
    expect(r.delivered).toBe(100)
    expect(r.peakMem).toBe(120)
    expect(bufferedOverflows(120, 100)).toBe(true)
    expect(bufferedOverflows(100, 100)).toBe(false)
  })

  it("peakMem = size: doubling the file doubles the peak (the unbounded case)", () => {
    const small = bufferedUpload(50, 100)
    const big = bufferedUpload(500, 100)
    expect(big.peakMem / small.peakMem).toBe(10)
  })
})

describe("streaming upload (peakMem bounded by chunkSize, independent of total size)", () => {
  it("never overflows and delivers the whole file when chunkSize <= capacity", () => {
    const r = streamingUpload(1000, 50, 100)
    expect(r.overflowed).toBe(0)
    expect(r.delivered).toBe(1000)
    expect(r.peakMem).toBe(50)
    expect(r.mode).toBe("streaming")
  })

  it("peakMem = chunkSize: a 10x bigger file has the SAME peak memory (the lesson)", () => {
    const small = streamingUpload(100, 50, 100)
    const big = streamingUpload(1000, 50, 100)
    expect(big.peakMem).toBe(small.peakMem)
    expect(big.peakMem).toBe(50)
    // peak stays flat while delivered grows 10x
    expect(big.delivered / small.delivered).toBe(10)
  })

  it("never overflows regardless of how huge the file is, as long as the chunk fits", () => {
    for (const size of [10, 100, 1_000, 1_000_000]) {
      const r = streamingUpload(size, 50, 100)
      expect(r.overflowed).toBe(0)
      expect(r.delivered).toBe(size)
      expect(r.peakMem).toBe(50)
    }
  })

  it("honours chunk boundaries: an odd remainder still fits one extra chunk", () => {
    const r = streamingUpload(125, 50, 100) // 2 full chunks + 25 remainder
    expect(r.delivered).toBe(125)
    expect(r.overflowed).toBe(0)
    expect(r.peakMem).toBe(50)
  })

  it("spills only when a chunk itself exceeds capacity (boundary honesty)", () => {
    const r = streamingUpload(250, 120, 100) // each 120-chunk spills 20
    expect(r.overflowed).toBe(40) // 2 full chunks * 20
    expect(r.delivered).toBe(210)
  })
})

describe("the buffered-vs-streamed contrast (both deliver the same total)", () => {
  it("buffered and streaming deliver the same total when nothing overflows", () => {
    const size = 400
    const buf = bufferedUpload(size, 500)
    const stream = streamingUpload(size, 50, 500)
    expect(buf.delivered).toBe(stream.delivered)
    expect(buf.delivered).toBe(size)
    // ...but their peak memory is wildly different
    expect(buf.peakMem).toBe(400)
    expect(stream.peakMem).toBe(50)
    expect(stream.peakMem).toBeLessThan(buf.peakMem)
  })

  it("streamed peak is flat while buffered peak grows — proven across a size sweep", () => {
    const capacity = 100
    const chunkSize = 40
    const bufPeaks: number[] = []
    const streamPeaks: number[] = []
    for (const size of [100, 200, 400, 800]) {
      bufPeaks.push(bufferedUpload(size, capacity).peakMem)
      streamPeaks.push(streamingUpload(size, chunkSize, capacity).peakMem)
    }
    // buffered peak grows linearly with size
    expect(bufPeaks).toEqual([100, 200, 400, 800])
    // streamed peak is constant
    expect(streamPeaks).toEqual([chunkSize, chunkSize, chunkSize, chunkSize])
  })

  it("peakRatio flags when the tank crests the rim", () => {
    expect(peakRatio(bufferedUpload(120, 100), 100)).toBeGreaterThan(1)
    expect(peakRatio(streamingUpload(1000, 50, 100), 100)).toBeLessThan(1)
  })
})

describe("throughput", () => {
  it("is delivered / timeMs, identical for equal delivered over equal time", () => {
    const buf = bufferedUpload(400, 500)
    const stream = streamingUpload(400, 50, 500)
    expect(throughput(buf, 1000)).toBe(throughput(stream, 1000))
    expect(throughput(stream, 1000)).toBe(0.4)
  })

  it("scales: twice the delivered in the same time is twice the throughput", () => {
    expect(throughput(bufferedUpload(800, 1000), 1000)).toBe(
      2 * throughput(bufferedUpload(400, 1000), 1000),
    )
  })

  it("throws on non-positive time", () => {
    expect(() => throughput(bufferedUpload(10, 20), 0)).toThrow("timeMs must be > 0")
  })
})

describe("backpressure (L4)", () => {
  it("stalls when the drain cannot keep up but nothing is lost", () => {
    // size 400, capacity 100, drain 0.1/ms over 1000ms → drainable 100, drained 100, backlog 300,
    // heldInTank 100, overflow 200. Not stalled — it overflows. Use a smaller file to stall.
    const stall = bufferedUploadBackpressured(150, 100, 0.1, 1000)
    // drained 100, backlog 50, heldInTank 50, overflow 0, stalled (drained < size, nothing lost)
    expect(stall.drained).toBe(100)
    expect(stall.delivered).toBe(150)
    expect(stall.overflowed).toBe(0)
    expect(stall.stalled).toBe(true)
  })

  it("overflows when the buffer fills faster than the drain clears", () => {
    // size 1000, capacity 100, drain 0.1/ms over 1000ms → drained 100, backlog 900, heldInTank 100,
    // overflow 800
    const r = bufferedUploadBackpressured(1000, 100, 0.1, 1000)
    expect(r.drained).toBe(100)
    expect(r.delivered).toBe(200)
    expect(r.overflowed).toBe(800)
    expect(r.stalled).toBe(false)
  })

  it("drains cleanly when the drain is fast enough", () => {
    // size 400, capacity 100, drain 0.5/ms over 1000ms → drainable 500 >= size, drained 400
    const r = bufferedUploadBackpressured(400, 100, 0.5, 1000)
    expect(r.drained).toBe(400)
    expect(r.delivered).toBe(400)
    expect(r.overflowed).toBe(0)
    expect(r.stalled).toBe(false)
  })
})

describe("determinism", () => {
  it("same inputs ⇒ same result, every time, for both modes", () => {
    const b1 = bufferedUpload(123, 100)
    const b2 = bufferedUpload(123, 100)
    expect(b1).toEqual(b2)
    const s1 = streamingUpload(999, 37, 100)
    const s2 = streamingUpload(999, 37, 100)
    expect(s1).toEqual(s2)
  })

  it("scenario params from a seeded RNG are replayable (the math stays pure of the RNG)", () => {
    const rngA = mulberry32(42)
    const rngB = mulberry32(42)
    const sizeA = intInRange(rngA, 50, 500)
    const sizeB = intInRange(rngB, 50, 500)
    expect(sizeA).toBe(sizeB)
    // the upload result is a pure function of those params, so the whole attempt replays
    expect(bufferedUpload(sizeA, 100)).toEqual(bufferedUpload(sizeB, 100))
  })
})

describe("edge cases / validation", () => {
  it("a zero-byte upload delivers nothing and uses no memory", () => {
    expect(bufferedUpload(0, 100)).toMatchObject({ delivered: 0, overflowed: 0, peakMem: 0 })
    expect(streamingUpload(0, 50, 100)).toMatchObject({ delivered: 0, overflowed: 0, peakMem: 50 })
  })

  it("rejects non-positive chunk size and negative inputs", () => {
    expect(() => streamingUpload(100, 0, 100)).toThrow("chunkSize must be > 0")
    expect(() => bufferedUpload(-1, 100)).toThrow("size must be >= 0")
    expect(() => peakRatio(bufferedUpload(10, 100), 0)).toThrow("capacity must be > 0")
  })
})
