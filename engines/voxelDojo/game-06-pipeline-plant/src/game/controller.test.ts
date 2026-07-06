import { describe, expect, it, vi } from "vitest"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: predicting the correct overflow clears the wave and emits a passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const truth = game.bufferedResult()
    const willOverflow = truth.overflowed > 0
    game.predictWillOverflow(willOverflow)
    game.predictOverflow(truth.overflowed)
    game.runUpload()
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L1")
    game2.start()
    game2.predictWillOverflow(false) // wrong
    game2.predictOverflow(0) // wrong
    game2.runUpload()
    expect(game2.snapshot.phase).toBe("failed")

    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U6-file-upload",
      project: "06_file_upload_pipeline",
      scenario_id: "pipeline-plant-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: predicting the streaming peak memory (= chunk size) clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    const peak = game.streamingTruthResult().peakMem
    game.predictPeak(peak)
    game.runUpload()
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L2")
    game2.start()
    game2.predictPeak(game2.snapshot.level.fileSize) // wrong — that's buffer thinking
    game2.runUpload()
    expect(game2.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })

  it("L3: peak memory tracks the chunk size, not the file size", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    game.setChunk(15)
    game.predictPeak(15)
    game.runUpload()
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L3")
    game2.start()
    game2.setChunk(15)
    game2.predictPeak(game2.snapshot.level.fileSize) // wrong
    game2.runUpload()
    expect(game2.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L4: predicting stall (not overflow) for a slow drain clears; predicting overflow fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const bufferOverflow = game.bufferedResult().overflowed
    game.predictStreamOutcome("stall")
    game.predictBufferOverflow(bufferOverflow)
    game.runUpload()
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L4")
    game2.start()
    game2.predictStreamOutcome("overflow") // wrong — streams stall, they don't overflow
    game2.predictBufferOverflow(game2.bufferedResult().overflowed)
    game2.runUpload()
    expect(game2.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })
})
