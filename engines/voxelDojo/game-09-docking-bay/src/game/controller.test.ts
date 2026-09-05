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

  it("L1 REJECTION CASE (AID-467): a pod with a dropped contract method is blocked, and the former all-dock oracle fails", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const game = new GameController("L1")
    game.start()

    // Ground truth: at least one pod docks and at least one is rejected.
    const truth = game.snapshot.pods.map((pod) => game.podWouldDock(pod))
    expect(truth.some(Boolean)).toBe(true)
    expect(truth.every(Boolean)).toBe(false)

    // A pod missing a host method must never dock.
    const rejected = game.snapshot.pods.filter((pod) => !game.podWouldDock(pod))
    expect(rejected.length).toBeGreaterThan(0)
    for (const pod of rejected) {
      const missing = HOST_CONTRACT.filter((c) => !pod.claimsContract.includes(c))
      expect(missing.length).toBeGreaterThan(0)
    }

    // Predicting "every pod docks" (the pre-fix constant-true oracle) fails the wave.
    for (const pod of game.snapshot.pods) {
      game.predictDock(pod.id, true)
    }
    expect(game.snapshot.phase).toBe("failed")
    const failed = evidenceLines(spy).map((l) => JSON.parse(l.slice("EVIDENCE ".length)))
    expect(failed[0]).toMatchObject({ scenario_id: "docking-bay-L1", pass: false })
    spy.mockRestore()
  })

  it("L1 resolution docks only the truthful dockers on the host (rejected pods never dock)", () => {
    const game = new GameController("L1")
    game.start()
    for (const pod of game.snapshot.pods) {
      game.predictDock(pod.id, game.podWouldDock(pod))
    }
    expect(game.snapshot.phase).toBe("cleared")
    for (const pod of game.snapshot.pods) {
      if (game.podWouldDock(pod)) {
        expect(game.snapshot.host.docked.has(pod.id)).toBe(true)
      } else {
        expect(game.snapshot.host.docked.has(pod.id)).toBe(false)
      }
    }
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
