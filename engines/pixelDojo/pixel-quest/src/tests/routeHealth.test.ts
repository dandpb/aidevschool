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
        kind: "pixelquest-route-health",
        routed: 3,
        bad_routes: 0,
        isolated: 2,
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
    const metrics = state.evidence?.metrics
    expect(metrics?.kind).toBe("pixelquest-route-health")
    if (metrics?.kind === "pixelquest-route-health") {
      expect(metrics.bad_routes).toBeGreaterThan(0)
    }
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
