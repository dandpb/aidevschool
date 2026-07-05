import { describe, expect, it } from "vitest"
import { curriculumPack } from "../content/curriculumPack"
import { applyPolicyGateAction, createPolicyGateState } from "../game/encounters/policyGate"

describe("policy gate encounters", () => {
  it("passes auth when allowed calls are permitted and denied calls are blocked", () => {
    const encounter = authEncounter()
    let state = createPolicyGateState(encounter)

    for (const action of ["admit", "reject", "admit", "reject", "reject", "admit"] as const) {
      state = applyPolicyGateAction(state, action, new Date("2026-06-11T12:00:00.000Z"))
    }

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(true)
    const metrics = state.evidence?.metrics
    expect(metrics?.kind).toBe("pixelquest-policy-gate")
    if (metrics?.kind === "pixelquest-policy-gate") {
      expect(metrics.allowed).toBe(3)
      expect(metrics.policy_leaks).toBe(0)
    }
    expect(state.evidence?.curriculum_context).toMatchObject({
      mechanic: "Auth Gate",
      accepted_signal: "token autorizado",
      rejected_trap: "escopo invalido",
    })
  })

  it("fails when a denied policy check leaks through", () => {
    const encounter = authEncounter()
    let state = createPolicyGateState(encounter)

    for (const action of ["admit", "admit", "admit", "reject", "reject", "admit"] as const) {
      state = applyPolicyGateAction(state, action, new Date("2026-06-11T12:00:00.000Z"))
    }

    expect(state.evidence?.pass).toBe(false)
    const metrics = state.evidence?.metrics
    expect(metrics?.kind).toBe("pixelquest-policy-gate")
    if (metrics?.kind === "pixelquest-policy-gate") {
      expect(metrics.policy_leaks).toBe(1)
      expect(metrics.overheated).toBe(true)
    }
  })
})

function authEncounter() {
  const encounter = curriculumPack.encounters.find(
    (candidate) => candidate.project === "07_rest_api_auth",
  )
  if (encounter === undefined || encounter.kind !== "policy_gate") {
    throw new Error("Expected REST API Auth policy_gate encounter")
  }
  return encounter
}
