import { describe, expect, it } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import { applySequenceAction, createSequenceState } from "../game/encounters/sequenceFlow"
import { validateEvidenceRecord } from "../game/evidence/evidence"

describe("sequence flow encounter", () => {
  it("passes when the learner advances required steps and guards traps", () => {
    const encounter = keyValueEncounter()
    let state = createSequenceState(encounter)
    for (const step of encounter.steps) {
      state = applySequenceAction(
        state,
        step.type === "advance" ? "admit" : "reject",
        new Date("2026-06-11T12:00:00.000Z"),
      )
    }

    expect(state.complete).toBe(true)
    expect(validateEvidenceRecord(state.evidence)).toMatchObject({
      project: "02_key_value_store",
      pass: true,
      metrics: {
        kind: "pixelquest-sequence-flow",
        advanced: 3,
        guards_missed: 0,
        skipped_required: 0,
      },
      curriculum_context: {
        mechanic: "TTL Cache",
        accepted_signal: "chave quente valida",
        rejected_trap: "leitura expirada",
      },
    })
  })

  it("fails when a guard step is incorrectly advanced", () => {
    const encounter = keyValueEncounter()
    let state = createSequenceState(encounter)
    for (const step of encounter.steps) {
      const action = step.type === "guard" ? "admit" : "admit"
      state = applySequenceAction(state, action, new Date("2026-06-11T12:00:00.000Z"))
    }

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(false)
    const metrics = state.evidence?.metrics
    expect(metrics?.kind).toBe("pixelquest-sequence-flow")
    if (metrics?.kind === "pixelquest-sequence-flow") {
      expect(metrics.guards_missed).toBeGreaterThan(0)
    }
  })
})

function keyValueEncounter() {
  const { pack } = loadCorePack()
  const encounter = pack.encounters.find((candidate) => candidate.project === "02_key_value_store")
  if (encounter === undefined || encounter.kind !== "sequence_flow") {
    throw new Error("expected key-value sequence encounter")
  }
  return encounter
}
