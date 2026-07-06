import { describe, expect, it, vi } from "vitest"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: correct source predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    // answer every prompt with the ground-truth source
    while (game.snapshot.phase === "predicting") {
      const logId = game.snapshot.prompts[game.snapshot.promptIndex]
      if (logId === undefined) break
      const truth = game.sourceOf(logId)
      if (truth === null) break
      game.predictSource(truth)
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U14-log-aggregator",
      project: "14_log_aggregator",
      scenario_id: "river-delta-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L1: a wrong source for every prompt fails the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    const sources = game.snapshot.level.sources
    while (game.snapshot.phase === "predicting") {
      const logId = game.snapshot.prompts[game.snapshot.promptIndex]
      if (logId === undefined) break
      const truth = game.sourceOf(logId) ?? ""
      // pick a source that is NOT the truth
      const wrong = sources.find((s) => s !== truth) ?? sources[0] ?? ""
      game.predictSource(wrong)
    }
    expect(game.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L2: correct pass/drop predictions clear the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    while (game.snapshot.phase === "predicting") {
      const logId = game.snapshot.prompts[game.snapshot.promptIndex]
      if (logId === undefined) break
      game.predictFilter(game.logReached(logId))
    }
    expect(game.snapshot.phase).toBe("cleared")
    const rec = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(rec[0]).toMatchObject({ scenario_id: "river-delta-L2", pass: true })
    spy.mockRestore()
  })

  it("L3: injecting at a real dye source and predicting the true source set clears", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const truthSources = game.traceSourceSet()
    expect(truthSources.length).toBeGreaterThan(0)
    // inject at the first truth source
    game.injectDye(truthSources[0] as string)
    // predict the full truth source set
    for (const s of truthSources) {
      if (!game.snapshot.predictedDyeSources.includes(s)) game.togglePredictedDyeSource(s)
    }
    game.lockInDyePath()
    expect(game.snapshot.phase).toBe("cleared")
    spy.mockRestore()
  })

  it("L3: injecting at a source the request never entered fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const truth = new Set(game.traceSourceSet())
    const all = game.snapshot.level.sources
    const bad = all.find((s) => !truth.has(s)) ?? all[0] ?? ""
    game.injectDye(bad)
    for (const s of game.traceSourceSet()) game.togglePredictedDyeSource(s)
    game.lockInDyePath()
    expect(game.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })

  it("L4: collecting exactly the trace's log ids clears; extras or missing fail", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const truthIds = game.traceLogIds()
    for (const id of truthIds) game.toggleCollectedLog(id)
    game.lockInTrace()
    expect(game.snapshot.phase).toBe("cleared")

    // now fail it by collecting an extra id
    const game2 = new GameController("L4")
    game2.start()
    for (const id of truthIds) game2.toggleCollectedLog(id)
    const extra = game2.snapshot.logs.find((l) => !truthIds.includes(l.logId))
    if (extra) game2.toggleCollectedLog(extra.logId)
    game2.lockInTrace()
    expect(game2.snapshot.phase).toBe("failed")
    spy.mockRestore()
  })
})
