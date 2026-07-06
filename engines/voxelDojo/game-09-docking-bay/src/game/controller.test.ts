import { describe, expect, it, vi } from "vitest"
import { HOST_CONTRACT } from "../sim/levels"
import { GameController } from "./controller"

function evidenceLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .map((c: unknown[]) => String(c[0]))
    .filter((l: string) => l.startsWith("EVIDENCE "))
}

describe("full headless playthrough (input → sim → evidence wiring)", () => {
  it("L1: correct dock predictions clear the wave and emit one passing record", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()
    for (const pod of game.snapshot.pods) {
      game.predictDock(pod.id, game.podWouldDock(pod))
    }
    expect(game.snapshot.phase).toBe("cleared")
    const records = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      source: "voxeldojo",
      unit_id: "U9-plugin-system",
      project: "09_plugin_system",
      scenario_id: "docking-bay-L1",
      pass: true,
    })
    spy.mockRestore()
  })

  it("L2: naming the exact missing method on each pod clears the wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L2")
    game.start()
    for (const pod of game.snapshot.pods) {
      game.predictMissing(pod.id, game.podMissing(pod))
    }
    expect(game.snapshot.phase).toBe("cleared")
    const rec = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(rec[0]).toMatchObject({ scenario_id: "docking-bay-L2", pass: true })
    spy.mockRestore()
  })

  it("L3: correct allow/block classifications clear the sandbox wave", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L3")
    game.start()
    const probe = game.snapshot.probe
    expect(probe).toBeTruthy()
    for (const m of probe?.invokedMethods ?? []) {
      game.classifyInvoke(m, game.probeAllows(m))
    }
    expect(game.snapshot.phase).toBe("cleared")
    const rec = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(rec[0]).toMatchObject({ scenario_id: "docking-bay-L3", pass: true })
    spy.mockRestore()
  })

  it("L4: choosing the minimal capability set clears; an over-grant fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L4")
    game.start()
    const minimal = game.minimalCapabilities()
    for (const c of minimal) game.toggleCapability(c)
    game.lockInCapabilities()
    expect(game.snapshot.phase).toBe("cleared")

    const game2 = new GameController("L4")
    game2.start()
    for (const c of HOST_CONTRACT) game2.toggleCapability(c) // over-grant everything
    game2.lockInCapabilities()
    expect(game2.snapshot.phase).toBe("failed")
    expect(evidenceLines(spy)).toHaveLength(2)
    spy.mockRestore()
  })
})
