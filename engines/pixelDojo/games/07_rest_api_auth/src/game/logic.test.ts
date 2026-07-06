import { describe, expect, it } from "vitest"
import {
  CANONICAL_ORDER,
  checkGate,
  composeCanonical,
  createState,
  cycleDockSelection,
  type GameState,
  type GateKind,
  INITIAL_DOCK_ORDER,
  isWin,
  type OrbSpec,
  openPortal,
  placeSelected,
  recallLastGate,
  step,
  WAVE_ORBS,
} from "./logic"

// Run the L1 wave to resolution against an arbitrary gate order, advancing
// the clock enough to push every orb through every gate.
function playWave(order: readonly GateKind[]): GameState {
  let state = createState(0, 1)
  // Force the desired order directly into the corridor.
  state.dockRemaining = []
  state.gateOrder = [...order]
  state.dockSelectedIndex = 0
  state = openPortal(state, 0)
  // Each orb needs CORRIDOR_TRANSIT_MS to fully cross; spawn interval paces
  // them. Step the clock well past the last possible resolution.
  const totalMs = 8 * 700 + 5000
  let now = 0
  const dt = 100
  while (now < totalMs) {
    state = step(state, now, dt)
    if (state.phase === "resolved") break
    now += dt
  }
  return state
}

describe("07_rest_api_auth logic", () => {
  it("starts in compose phase with the scrambled dock", () => {
    const state = createState(0, 1)
    expect(state.phase).toBe("compose")
    expect(state.dockRemaining).toEqual([...INITIAL_DOCK_ORDER])
    expect(state.gateOrder).toEqual([])
    expect(state.dockSelectedIndex).toBe(0)
  })

  it("canonical order is Version -> Validation -> AuthN -> AuthZ", () => {
    expect(CANONICAL_ORDER).toEqual(["version", "validation", "authn", "authz"])
  })

  it("L1 wave covers every breach class plus two legit orbs", () => {
    const tokens = WAVE_ORBS.map((o) => o.token).sort()
    expect(tokens).toContain("forged")
    expect(tokens).toContain("expired")
    expect(tokens).toContain("wrong_audience")
    expect(tokens).toContain("valid")
    expect(WAVE_ORBS.some((o) => o.body === "malformed")).toBe(true)
    expect(WAVE_ORBS.some((o) => o.version === "v2")).toBe(true)
    expect(WAVE_ORBS.some((o) => o.policy === "admin_only" && o.role === "user")).toBe(true)
    expect(WAVE_ORBS.filter((o) => o.isLegit)).toHaveLength(2)
  })

  it("checkGate admits a fully-legit orb at every gate", () => {
    const legit: OrbSpec = {
      id: 1,
      version: "v1",
      body: "well_formed",
      token: "valid",
      role: "user",
      policy: "public",
      label: "legit",
      isLegit: true,
    }
    for (const gate of CANONICAL_ORDER) {
      expect(checkGate(gate, legit)).toBe(0)
    }
  })

  it("checkGate rejects each breach class at exactly its own gate", () => {
    const forged: OrbSpec = {
      id: 1,
      version: "v1",
      body: "well_formed",
      token: "forged",
      role: "admin",
      policy: "admin_only",
      label: "forged",
      isLegit: false,
    }
    expect(checkGate("authn", forged)).toBe(401)
    // Forged tokens pass AuthZ (AuthZ only checks role) — that is the trap.
    expect(checkGate("authz", forged)).toBe(0)

    const expired = { ...forged, token: "expired" as const }
    expect(checkGate("authn", expired)).toBe(401)

    const malformed: OrbSpec = {
      id: 2,
      version: "v1",
      body: "malformed",
      token: "valid",
      role: "user",
      policy: "public",
      label: "bad",
      isLegit: false,
    }
    expect(checkGate("validation", malformed)).toBe(400)
    // A malformed body does NOT fail AuthN — separation of concerns.
    expect(checkGate("authn", malformed)).toBe(0)

    const v2: OrbSpec = {
      id: 3,
      version: "v2",
      body: "well_formed",
      token: "valid",
      role: "user",
      policy: "public",
      label: "v2",
      isLegit: false,
    }
    expect(checkGate("version", v2)).toBe(404)

    const forbidden: OrbSpec = {
      id: 4,
      version: "v1",
      body: "well_formed",
      token: "valid",
      role: "user",
      policy: "admin_only",
      label: "forbidden",
      isLegit: false,
    }
    expect(checkGate("authz", forbidden)).toBe(403)
  })

  it("composeCanonical places all four gates in canonical order and empties the dock", () => {
    let state = createState(0, 1)
    state = composeCanonical(state)
    expect(state.gateOrder).toEqual([...CANONICAL_ORDER])
    expect(state.dockRemaining).toEqual([])
  })

  it("cycleDockSelection wraps in both directions within the dock", () => {
    let state = createState(0, 1)
    expect(state.dockSelectedIndex).toBe(0)
    state = cycleDockSelection(state, -1)
    expect(state.dockSelectedIndex).toBe(state.dockRemaining.length - 1)
    state = cycleDockSelection(state, 1)
    expect(state.dockSelectedIndex).toBe(0)
  })

  it("placeSelected moves the dock gate into the corridor and clamps selection", () => {
    let state = createState(0, 1)
    const before = state.dockRemaining.length
    state = placeSelected(state)
    expect(state.gateOrder).toHaveLength(1)
    expect(state.dockRemaining).toHaveLength(before - 1)
  })

  it("recallLastGate undoes the last placement", () => {
    let state = createState(0, 1)
    state = placeSelected(state)
    expect(state.gateOrder).toHaveLength(1)
    const placed = state.gateOrder[0]
    expect(placed).toBeDefined()
    state = recallLastGate(state)
    expect(state.gateOrder).toEqual([])
    expect(state.dockRemaining).toHaveLength(INITIAL_DOCK_ORDER.length)
    // The recalled gate is back in the dock (membership, not exact position —
    // recall appends to the end of the dock, which is fine for player UX).
    expect(state.dockRemaining).toContain(placed)
  })

  it("openPortal refuses until all four gates are placed", () => {
    let state = createState(0, 1)
    state = openPortal(state, 0)
    expect(state.phase).toBe("compose")
    state = composeCanonical(state)
    state = openPortal(state, 0)
    expect(state.phase).toBe("running")
  })

  it("canonical order wins the L1 wave with zero breaches", () => {
    const state = playWave(CANONICAL_ORDER)
    expect(state.phase).toBe("resolved")
    const m = state.metrics
    expect(m.correct_order).toBe(true)
    expect(m.forged_admitted).toBe(0)
    expect(m.expired_admitted).toBe(0)
    expect(m.wrong_audience_admitted).toBe(0)
    expect(m.missing_token_admitted).toBe(0)
    expect(m.forbidden_reached_handler).toBe(0)
    expect(m.malformed_admitted).toBe(0)
    expect(m.wrong_version_admitted).toBe(0)
    expect(m.legit_admitted).toBe(2)
    expect(m.legit_rejected).toBe(0)
    expect(m.overheated).toBe(false)
    expect(state.pass).toBe(true)
    expect(isWin(m)).toBe(true)
  })

  it("AuthZ before AuthN leaks the forged admin orb into the handler (BREACH)", () => {
    // Swap AuthN and AuthZ so AuthZ runs first. The forged orb carries an
    // admin claim, so it sails past AuthZ and detonates the admin pedestal.
    const wrongOrder: GateKind[] = ["version", "validation", "authz", "authn"]
    const state = playWave(wrongOrder)
    expect(state.phase).toBe("resolved")
    const m = state.metrics
    expect(m.correct_order).toBe(false)
    // Forged admin orb reached the admin handler -> security breach.
    expect(m.forged_admitted).toBeGreaterThan(0)
    expect(state.pass).toBe(false)
    expect(isWin(m)).toBe(false)
  })

  it("any non-canonical permutation fails the gate even if no breach slips past", () => {
    // Validation <-> Version swap: admissions stay clean (every breach class
    // is still caught somewhere) but correct_order is false, so pass is false.
    const swapped: GateKind[] = ["validation", "version", "authn", "authz"]
    const state = playWave(swapped)
    expect(state.metrics.correct_order).toBe(false)
    expect(state.pass).toBe(false)
  })
})
