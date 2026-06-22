import { describe, expect, it } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import { applyRouteHealthAction, createRouteHealthState } from "../game/encounters/routeHealth"
import { validateEvidenceRecord } from "../game/evidence/evidence"

describe("route health encounter", () => {
  it("passes when traffic is routed only to healthy targets", () => {
    const encounter = loadBalancerEncounter()
    let state = createRouteHealthState(encounter)
    for (const check of encounter.checks) {
      state = applyRouteHealthAction(
        state,
        check.type === "healthy" ? "admit" : "reject",
        new Date("2026-06-11T12:00:00.000Z"),
      )
    }

    expect(state.complete).toBe(true)
    expect(validateEvidenceRecord(state.evidence)).toMatchObject({
      project: "11_load_balancer",
      pass: true,
      metrics: {
        good_admits: 3,
        abusive_admitted: 0,
        abusive_rejected: 2,
      },
      curriculum_context: {
        mechanic: "Health Router",
        accepted_signal: "no saudavel",
        rejected_trap: "no degradado",
      },
    })
  })

  it("fails when traffic is routed to an unhealthy target", () => {
    const encounter = loadBalancerEncounter()
    let state = createRouteHealthState(encounter)
    for (const _check of encounter.checks) {
      state = applyRouteHealthAction(state, "admit", new Date("2026-06-11T12:00:00.000Z"))
    }

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(false)
    expect(state.evidence?.metrics.abusive_admitted).toBeGreaterThan(0)
  })
})

function loadBalancerEncounter() {
  const { pack } = loadCorePack()
  const encounter = pack.encounters.find((candidate) => candidate.project === "11_load_balancer")
  if (encounter === undefined || encounter.kind !== "route_health") {
    throw new Error("expected load-balancer route health encounter")
  }
  return encounter
}
