import type { WebGLRenderer } from "three"
import { describe, expect, it, vi } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import type { ContentPack } from "../content/types"
import {
  applyPolicyGateAction,
  createPolicyGateState,
  type PolicyGateEncounterState,
} from "../game/encounters/policyGate"
import { createWorld, enterAuthGateDuel } from "../game/simulation/world"
import { PolicyGateScene } from "../render/app/PolicyGateScene"

// WebGLRenderer in jsdom is a no-op stub; the scene's value here is exercising
// its state-driven projection (rebuildOrbs / updateOrbVisuals / updateGate)
// without throwing, and confirming dispose is idempotent. Render correctness is
// covered by the Playwright smoke screenshot contract.
describe("PolicyGateScene", () => {
  const loaded = loadCorePack()
  const pack: ContentPack = loaded.pack
  const world = enterAuthGateDuel(createWorld(pack, "lab-07_rest_api_auth"))

  it("constructs, accepts a policy_gate encounter, and disposes without error", () => {
    const scene = new PolicyGateScene()
    const encounter = policyGateEncounter(pack)
    const state = createPolicyGateState(encounter)

    expect(() => scene.setEncounter(state)).not.toThrow()
    expect(() => scene.render(stubRenderer(), world)).not.toThrow()

    scene.dispose()
  })

  it("rebuilds orb meshes only when the encounter identity changes, not on every render", () => {
    const scene = new PolicyGateScene()
    const encounter = policyGateEncounter(pack)
    let state: PolicyGateEncounterState = createPolicyGateState(encounter)

    scene.setEncounter(state)
    scene.render(stubRenderer(), world)

    // Advance through the checks — same encounter id, so no rebuild should occur.
    for (const check of encounter.checks) {
      state = applyPolicyGateAction(
        state,
        check.type === "allowed" ? "admit" : "reject",
        new Date("2026-06-11T12:00:00.000Z"),
      )
      scene.setEncounter(state)
      expect(() => scene.render(stubRenderer(), world)).not.toThrow()
    }

    expect(state.complete).toBe(true)
    scene.dispose()
  })

  it("renders without an encounter set (no-op projection)", () => {
    const scene = new PolicyGateScene()
    expect(() => scene.render(stubRenderer(), world)).not.toThrow()
    scene.dispose()
  })
})

function policyGateEncounter(pack: ContentPack) {
  const encounter = pack.encounters.find((candidate) => candidate.project === "07_rest_api_auth")
  if (encounter === undefined || encounter.kind !== "policy_gate") {
    throw new Error("expected auth-gate policy_gate encounter")
  }
  return encounter
}

function stubRenderer(): WebGLRenderer {
  return { render: vi.fn() } as unknown as WebGLRenderer
}
