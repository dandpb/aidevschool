import { describe, expect, it } from "vitest"
import {
  createAccessibleProjectionModel,
  type AccessibleProjectionOptions,
} from "./accessibleProjection"

type SimulationSnapshot = {
  readonly phase: "predicting" | "completed"
  readonly choice: string | null
}

class DeterministicSimulation {
  snapshot: SimulationSnapshot = { phase: "predicting", choice: null }
  readonly evidence: Array<Readonly<Record<string, unknown>>> = []

  choose(choice: string): void {
    if (this.snapshot.phase !== "predicting") return
    const pass = choice === "shelf-2"
    this.snapshot = { phase: "completed", choice }
    this.evidence.push({
      schema: "teaching-game-evidence",
      scenario_id: "projection-equivalence",
      pass,
      observations: { choice },
    })
  }
}

function accessibleOptions(
  simulation: DeterministicSimulation,
): AccessibleProjectionOptions<SimulationSnapshot> {
  return {
    label: "Deterministic teaching simulation",
    summarize: (snapshot) => ({
      title: "Hash shelf prediction",
      status: snapshot.phase,
      description: "Choose the shelf produced by the same deterministic hash.",
      details: [`Choice: ${snapshot.choice ?? "pending"}`],
    }),
    actions: (snapshot) =>
      snapshot.phase === "predicting"
        ? [0, 1, 2].map((shelf) => ({
            id: `shelf-${shelf}`,
            label: `Choose shelf ${shelf}`,
            run: () => simulation.choose(`shelf-${shelf}`),
          }))
        : [],
  }
}

describe("accessible projection equivalence", () => {
  it("dispatches the same command and preserves snapshot, completion, and evidence meaning", () => {
    const webglSimulation = new DeterministicSimulation()
    const accessibleSimulation = new DeterministicSimulation()

    webglSimulation.choose("shelf-2")
    const accessible = createAccessibleProjectionModel(
      accessibleOptions(accessibleSimulation),
      accessibleSimulation.snapshot,
    )
    accessible.actions.find((action) => action.id === "shelf-2")?.run()

    expect(accessible.summary).toMatchObject({
      title: "Hash shelf prediction",
      status: "predicting",
    })
    expect(accessibleSimulation.snapshot).toEqual(webglSimulation.snapshot)
    expect(accessibleSimulation.evidence).toEqual(webglSimulation.evidence)
    expect(accessibleSimulation.evidence).toEqual([
      expect.objectContaining({ pass: true, scenario_id: "projection-equivalence" }),
    ])
  })

  it("does not invent alternate pass criteria for an incorrect accessible action", () => {
    const simulation = new DeterministicSimulation()
    const accessible = createAccessibleProjectionModel(
      accessibleOptions(simulation),
      simulation.snapshot,
    )
    accessible.actions.find((action) => action.id === "shelf-1")?.run()

    expect(simulation.snapshot).toEqual({ phase: "completed", choice: "shelf-1" })
    expect(simulation.evidence).toEqual([expect.objectContaining({ pass: false })])
  })
})
