import { describe, expect, it } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import { applySequenceAction, createSequenceState } from "../game/encounters/sequenceFlow"
import { validateEvidenceRecord } from "../game/evidence/evidence"

describe("sequence flow encounter", () => {
  it("plays the Agent Quest MVP by activating agent steps and blocking shortcuts", () => {
    const encounter = agentQuestEncounter()
    let state = createSequenceState(encounter)
    for (const step of encounter.steps) {
      state = applySequenceAction(
        state,
        step.type === "advance" ? "admit" : "reject",
        new Date("2026-06-11T12:00:00.000Z"),
      )
    }

    expect(encounter.steps.filter((step) => step.type === "guard")).toHaveLength(5)
    expect(state.complete).toBe(true)
    expect(validateEvidenceRecord(state.evidence)).toMatchObject({
      project: "01_rate_limiter",
      encounter_id: "encounter-agent-quest-01",
      pass: true,
      metrics: {
        good_admits: 5,
        abusive_admitted: 0,
        legit_rejected: 0,
      },
      curriculum_context: {
        concept: "Orquestracao agentica para provar robustez de token bucket",
        mechanic: "Agent Quest",
        accepted_signal: "acao agentica correta",
        rejected_trap: "atalho sem evidencia",
      },
    })
  })

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
        good_admits: 3,
        abusive_admitted: 0,
        legit_rejected: 0,
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
    expect(state.evidence?.metrics.abusive_admitted).toBeGreaterThan(0)
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

function agentQuestEncounter() {
  const { pack } = loadCorePack()
  const encounter = pack.encounters.find((candidate) => candidate.project === "01_rate_limiter")
  if (encounter === undefined || encounter.kind !== "sequence_flow") {
    throw new Error("expected Agent Quest sequence encounter")
  }
  return encounter
}
