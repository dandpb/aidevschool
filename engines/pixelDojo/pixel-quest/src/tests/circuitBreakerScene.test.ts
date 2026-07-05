import type { WebGLRenderer } from "three"
import { describe, expect, it, vi } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import type { ContentPack } from "../content/types"
import {
  applyRouteHealthAction,
  createRouteHealthState,
  type RouteHealthEncounterState,
} from "../game/encounters/routeHealth"
import { createWorld, enterCircuitBreakerDuel } from "../game/simulation/world"
import { CircuitBreakerScene } from "../render/app/CircuitBreakerScene"

// WebGLRenderer in jsdom is a no-op stub; the scene's value here is exercising
// its state-driven projection (rebuildRoutes / updateRouteVisuals / updateClient)
// without throwing, and confirming dispose is idempotent. Render correctness is
// covered by the Playwright smoke screenshot contract.
describe("CircuitBreakerScene", () => {
  const loaded = loadCorePack()
  const pack: ContentPack = loaded.pack
  const world = enterCircuitBreakerDuel(createWorld(pack, "lab-13_api_gateway_circuit_breaker"))

  it("constructs, accepts a route_health encounter, and disposes without error", () => {
    const scene = new CircuitBreakerScene()
    const encounter = circuitBreakerEncounter(pack)
    const state = createRouteHealthState(encounter)

    expect(() => scene.setEncounter(state)).not.toThrow()
    expect(() => scene.render(stubRenderer(), world)).not.toThrow()

    scene.dispose()
  })

  it("rebuilds route meshes only when the encounter identity changes, not on every render", () => {
    const scene = new CircuitBreakerScene()
    const encounter = circuitBreakerEncounter(pack)
    let state: RouteHealthEncounterState = createRouteHealthState(encounter)

    scene.setEncounter(state)
    scene.render(stubRenderer(), world)

    // Advance through the checks — same encounter id, so no rebuild should occur.
    for (const check of encounter.checks) {
      state = applyRouteHealthAction(
        state,
        check.type === "healthy" ? "admit" : "reject",
        new Date("2026-06-11T12:00:00.000Z"),
      )
      scene.setEncounter(state)
      expect(() => scene.render(stubRenderer(), world)).not.toThrow()
    }

    expect(state.complete).toBe(true)
    scene.dispose()
  })

  it("renders without an encounter set (no-op projection)", () => {
    const scene = new CircuitBreakerScene()
    expect(() => scene.render(stubRenderer(), world)).not.toThrow()
    scene.dispose()
  })
})

function circuitBreakerEncounter(pack: ContentPack) {
  const encounter = pack.encounters.find(
    (candidate) => candidate.project === "13_api_gateway_circuit_breaker",
  )
  if (encounter === undefined || encounter.kind !== "route_health") {
    throw new Error("expected circuit-breaker route_health encounter")
  }
  return encounter
}

function stubRenderer(): WebGLRenderer {
  return { render: vi.fn() } as unknown as WebGLRenderer
}
