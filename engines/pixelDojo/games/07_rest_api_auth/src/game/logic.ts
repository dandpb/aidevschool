// Pure middleware-chain game logic for 07_rest_api_auth (Aegis Corridor).
//
// The pedagogical core is the ORDERED middleware chain that protects a REST
// route: Version -> Validation -> AuthN -> AuthZ -> Handler. Each gate is
// separable and independently placeable, but only the canonical order both
// admits legit traffic AND rejects every breach class. Misplace AuthZ before
// AuthN and a forged token carrying a fake `admin` claim sails through RBAC
// and detonates the admin handler. Misplace Validation after the handler and
// a malformed body crashes the server. The pure state machine below is what
// the three.js scene mirrors; all discipline (no AuthN bypass, no AuthZ
// bypass, no Validation bypass, no Version bypass, no gratuitous false
// denies) is enforced here so the unit test can prove it without a GPU.

export type GateKind = "version" | "validation" | "authn" | "authz"

// The one true chain. The win rule requires gateOrder to equal this exactly.
export const CANONICAL_ORDER: readonly GateKind[] = ["version", "validation", "authn", "authz"]

export const GATE_LABELS: Record<GateKind, string> = {
  version: "VERSION",
  validation: "VALIDATION",
  authn: "AUTHN",
  authz: "AUTHZ",
}

export const GATE_DESCRIPTIONS: Record<GateKind, string> = {
  version: "Reject /v2 and unknown paths with 404 VERSION_UNSUPPORTED.",
  validation: "Reject malformed/unknown-field bodies with 400 BAD_REQUEST.",
  authn: "Verify JWT signature, iss, aud, exp, jti; reject with 401 UNAUTHENTICATED.",
  authz: "Match authenticated role vs route policy; reject with 403 FORBIDDEN.",
}

// Dock starts in this scrambled order so the player must recompose to
// canonical. Deterministic so the unit test and smoke can both reason about
// the navigation. (Waves 2 and 3 would reshuffle; the L1 wave is fixed.)
export const INITIAL_DOCK_ORDER: readonly GateKind[] = ["authz", "authn", "version", "validation"]

export type TokenState = "valid" | "forged" | "expired" | "wrong_audience" | "missing"
export type Role = "user" | "admin" | "none"
export type BodyState = "well_formed" | "malformed"
export type VersionTag = "v1" | "v2"
export type PolicyKind = "public" | "admin_only" | "self_or_admin"

export type OrbSpec = {
  readonly id: number
  readonly version: VersionTag
  readonly body: BodyState
  readonly token: TokenState
  readonly role: Role
  readonly policy: PolicyKind
  readonly label: string
  // True when this orb SHOULD reach its handler under the canonical chain.
  readonly isLegit: boolean
}

export type Orb = OrbSpec & {
  // Index into state.gateOrder of the next gate this orb must traverse.
  nextGateIndex: number
  rejected: boolean
  admitted: boolean
  rejectCode: number | null
  rejectedAtGate: GateKind | null
  // Visual-only: 0..1 progress along the corridor, advanced in step().
  progress: number
  // Set when AuthZ admits — the orb is committed to its target pedestal and
  // skips remaining gates. This models the AuthZ "policy decision point":
  // once AuthZ authorises the (claimed) principal, the orb is routed to its
  // handler. If AuthZ runs BEFORE AuthN (the canonical trap), the orb is
  // routed using an UNVERIFIED role claim — forged admin tokens sail into
  // the admin pedestal and detonate it. Under canonical order AuthN rejects
  // forged tokens first, so AuthZ never sees the fake claim.
  routingCommitted: boolean
}

export type Phase = "compose" | "running" | "resolved"

export type Metrics = {
  readonly kind: "threejs-middleware-chain"
  readonly wave: number
  readonly gate_order: readonly GateKind[]
  readonly correct_order: boolean
  readonly forged_admitted: number
  readonly expired_admitted: number
  readonly wrong_audience_admitted: number
  readonly missing_token_admitted: number
  readonly forbidden_reached_handler: number
  readonly malformed_admitted: number
  readonly wrong_version_admitted: number
  readonly legit_admitted: number
  readonly legit_rejected: number
  readonly heat_peak: number
  readonly overheated: boolean
}

export type GameState = {
  readonly wave: number
  phase: Phase
  // Gates still in the dock (not yet placed). Order = visual left-to-right.
  dockRemaining: GateKind[]
  // Slot fill order, index 0 = first gate orbs hit.
  gateOrder: GateKind[]
  dockSelectedIndex: number
  orbs: Orb[]
  nextOrbId: number
  spawnedCount: number
  nextSpawnAt: number
  metrics: Metrics
  startedAt: number
  resolvedAt: number | null
  heat: number
  heatPeak: number
  pass: boolean
}

export const MAX_HEAT = 100
// Wave duration tuning. The simulation advances in ms; orbs travel the
// corridor in CORRIDOR_TRANSIT_MS and the spawn interval paces them.
export const SPAWN_INTERVAL_MS = 700
export const CORRIDOR_TRANSIT_MS = 4200
// Each rejected orb adds HEAT_PER_BREACH to the heat meter; each legit
// admission cools the chain by HEAT_COOL_PER_ADMIT.
export const HEAT_PER_BREACH = 35
export const HEAT_COOL_PER_ADMIT = 6
export const HEAT_PER_FALSE_DENY = 18

// The L1 wave — eight orbs that exercise every breach class plus the two
// legitimate traffic shapes. Designed so canonical order admits 2 and
// rejects 6 at the correct gates, while any other order leaks at least one
// breach to a handler. Deterministic so the test and smoke agree.
export const WAVE_ORBS: readonly OrbSpec[] = [
  {
    id: 1,
    version: "v1",
    body: "well_formed",
    token: "valid",
    role: "user",
    policy: "public",
    label: "GET /v1/auth/login",
    isLegit: true,
  },
  {
    id: 2,
    version: "v1",
    body: "well_formed",
    token: "valid",
    role: "admin",
    policy: "admin_only",
    label: "GET /v1/users",
    isLegit: true,
  },
  {
    id: 3,
    version: "v1",
    body: "well_formed",
    token: "forged",
    role: "admin",
    policy: "admin_only",
    label: "GET /v1/users (forged)",
    isLegit: false,
  },
  {
    id: 4,
    version: "v1",
    body: "well_formed",
    token: "expired",
    role: "user",
    policy: "public",
    label: "GET /v1/auth/refresh (expired)",
    isLegit: false,
  },
  {
    id: 5,
    version: "v1",
    body: "well_formed",
    token: "wrong_audience",
    role: "user",
    policy: "public",
    label: "GET /v1/auth/me (wrong aud)",
    isLegit: false,
  },
  {
    id: 6,
    version: "v1",
    body: "malformed",
    token: "valid",
    role: "user",
    policy: "public",
    label: "POST /v1/users (bad body)",
    isLegit: false,
  },
  {
    id: 7,
    version: "v2",
    body: "well_formed",
    token: "valid",
    role: "user",
    policy: "public",
    label: "GET /v2/users (deprecated)",
    isLegit: false,
  },
  {
    id: 8,
    version: "v1",
    body: "well_formed",
    token: "valid",
    role: "user",
    policy: "admin_only",
    label: "GET /v1/users (user as admin)",
    isLegit: false,
  },
]

export function emptyMetrics(wave: number): Metrics {
  return {
    kind: "threejs-middleware-chain",
    wave,
    gate_order: [],
    correct_order: false,
    forged_admitted: 0,
    expired_admitted: 0,
    wrong_audience_admitted: 0,
    missing_token_admitted: 0,
    forbidden_reached_handler: 0,
    malformed_admitted: 0,
    wrong_version_admitted: 0,
    legit_admitted: 0,
    legit_rejected: 0,
    heat_peak: 0,
    overheated: false,
  }
}

export function createState(now: number, wave = 1): GameState {
  return {
    wave,
    phase: "compose",
    dockRemaining: [...INITIAL_DOCK_ORDER],
    gateOrder: [],
    dockSelectedIndex: 0,
    orbs: [],
    nextOrbId: 1,
    spawnedCount: 0,
    nextSpawnAt: now,
    metrics: emptyMetrics(wave),
    startedAt: now,
    resolvedAt: null,
    heat: 0,
    heatPeak: 0,
    pass: false,
  }
}

// --- Compose phase -------------------------------------------------------

// Move the dock selection cursor. NES-pad friendly: -1 = left, +1 = right.
export function cycleDockSelection(state: GameState, direction: 1 | -1): GameState {
  if (state.phase !== "compose") return state
  if (state.dockRemaining.length === 0) return state
  const n = state.dockRemaining.length
  const next = (((state.dockSelectedIndex + direction) % n) + n) % n
  state.dockSelectedIndex = next
  return state
}

// Push the currently-selected dock gate into the next corridor slot.
export function placeSelected(state: GameState): GameState {
  if (state.phase !== "compose") return state
  if (state.dockRemaining.length === 0) return state
  const idx = state.dockSelectedIndex
  const gate = state.dockRemaining[idx]
  if (gate === undefined) return state
  state.gateOrder = [...state.gateOrder, gate]
  state.dockRemaining = state.dockRemaining.filter((_, i) => i !== idx)
  // Clamp selection to remaining range.
  if (state.dockSelectedIndex >= state.dockRemaining.length) {
    state.dockSelectedIndex = Math.max(0, state.dockRemaining.length - 1)
  }
  return state
}

// Recall the last placed corridor ring back to the dock (undo).
export function recallLastGate(state: GameState): GameState {
  if (state.phase !== "compose") return state
  if (state.gateOrder.length === 0) return state
  const last = state.gateOrder[state.gateOrder.length - 1]
  if (last === undefined) return state
  state.gateOrder = state.gateOrder.slice(0, -1)
  state.dockRemaining = [...state.dockRemaining, last]
  state.dockSelectedIndex = state.dockRemaining.length - 1
  return state
}

// Debug / smoke helper: place the canonical order in one shot. Uses the same
// placeSelected path so the underlying state machine is exercised.
export function composeCanonical(state: GameState): GameState {
  if (state.phase !== "compose") return state
  // Reset to a fresh compose to keep this idempotent.
  state.dockRemaining = [...INITIAL_DOCK_ORDER]
  state.gateOrder = []
  state.dockSelectedIndex = 0
  for (const target of CANONICAL_ORDER) {
    const idx = state.dockRemaining.indexOf(target)
    if (idx < 0) continue
    state.dockSelectedIndex = idx
    placeSelected(state)
  }
  return state
}

// --- Run phase -----------------------------------------------------------

// Open the entry portal. Requires all four gates placed.
export function openPortal(state: GameState, now: number): GameState {
  if (state.phase !== "compose") return state
  if (state.gateOrder.length !== CANONICAL_ORDER.length) return state
  state.phase = "running"
  state.startedAt = now
  state.nextSpawnAt = now
  return state
}

function spawnNextOrb(state: GameState, now: number): GameState {
  if (state.spawnedCount >= WAVE_ORBS.length) return state
  if (now < state.nextSpawnAt) return state
  const spec = WAVE_ORBS[state.spawnedCount]
  if (spec === undefined) return state
  state.orbs = [
    ...state.orbs,
    {
      ...spec,
      nextGateIndex: 0,
      rejected: false,
      admitted: false,
      rejectCode: null,
      rejectedAtGate: null,
      progress: 0,
      routingCommitted: false,
    },
  ]
  state.spawnedCount += 1
  state.nextSpawnAt = now + SPAWN_INTERVAL_MS
  return state
}

// The core teaching moment: run one gate's check on an orb. Returns the
// reject code (0 = admit) for that gate. This is THE security invariant —
// each gate only inspects its own concern, and only the canonical order
// makes every breach class bounce at the right ring.
export function checkGate(gate: GateKind, orb: OrbSpec): number {
  switch (gate) {
    case "version":
      return orb.version === "v1" ? 0 : 404
    case "validation":
      return orb.body === "well_formed" ? 0 : 400
    case "authn":
      // JWT signature/iss/aud/exp/jti. Only "valid" passes; every other
      // token state is unauthenticated. Role claims are NOT verified here —
      // that is AuthZ's job, and that separation is the lesson.
      return orb.token === "valid" ? 0 : 401
    case "authz": {
      // Role-vs-policy. The principal must already be authenticated (AuthN
      // passed). "none" role never authenticates, so it cannot reach here in
      // canonical order; but if AuthZ runs first, a forged admin claim goes
      // through — which is exactly the bug we are teaching.
      if (orb.policy === "public") return 0
      if (orb.policy === "admin_only") return orb.role === "admin" ? 0 : 403
      // self_or_admin: user principal satisfies "self"; we treat any
      // authenticated principal as able to act on itself.
      return orb.role === "admin" || orb.role === "user" ? 0 : 403
    }
  }
}

// Advance a single orb through whichever gate it just reached. Returns the
// updated orb (the caller writes it back into state.orbs).
function advanceOrbThroughGates(state: GameState, orb: Orb, now: number): Orb {
  if (orb.rejected || orb.admitted) return orb
  // How far along the corridor (in gate units) the orb has traveled.
  // Each gate occupies a fraction of the corridor; the orb reaches gate i
  // when its progress crosses (i + 0.5) / gateCount. The handler is at 1.0.
  const gateCount = state.gateOrder.length
  if (gateCount === 0) return orb
  // Once AuthZ has admitted, the orb is committed to its pedestal and the
  // remaining gates are bypassed (the policy decision is final). This is the
  // surface the AuthN-before-AuthZ invariant plays on: a misplaced AuthZ
  // commits the orb before AuthN can verify the token.
  while (orb.nextGateIndex < gateCount && !orb.routingCommitted) {
    const gateThreshold = (orb.nextGateIndex + 0.5) / gateCount
    if (orb.progress < gateThreshold) break
    const gate = state.gateOrder[orb.nextGateIndex]
    if (gate === undefined) break
    const code = checkGate(gate, orb)
    if (code !== 0) {
      return {
        ...orb,
        rejected: true,
        rejectCode: code,
        rejectedAtGate: gate,
      }
    }
    orb = { ...orb, nextGateIndex: orb.nextGateIndex + 1 }
    if (gate === "authz") {
      orb = { ...orb, routingCommitted: true }
    }
  }
  // Past the last gate, OR AuthZ committed the orb -> reached the handler.
  if (
    !orb.rejected &&
    orb.progress >= 1 &&
    (orb.nextGateIndex >= gateCount || orb.routingCommitted)
  ) {
    return resolveAdmission(state, orb, now)
  }
  return orb
}

// An orb reached the handler. Counts against the appropriate breach metric
// if it should not have been admitted; counts for legit_admitted otherwise.
function resolveAdmission(state: GameState, orb: Orb, _now: number): Orb {
  const metrics = { ...state.metrics }
  let heat = state.heat
  if (orb.isLegit) {
    metrics.legit_admitted += 1
    heat = Math.max(0, heat - HEAT_COOL_PER_ADMIT)
  } else {
    // Class the breach.
    if (orb.token === "forged") metrics.forged_admitted += 1
    if (orb.token === "expired") metrics.expired_admitted += 1
    if (orb.token === "wrong_audience") metrics.wrong_audience_admitted += 1
    if (orb.token === "missing") metrics.missing_token_admitted += 1
    if (orb.body === "malformed") metrics.malformed_admitted += 1
    if (orb.version === "v2") metrics.wrong_version_admitted += 1
    // Forbidden role reaching an admin pedestal is an AuthZ bypass.
    if (orb.policy === "admin_only" && orb.role !== "admin") {
      metrics.forbidden_reached_handler += 1
    }
    heat += HEAT_PER_BREACH
  }
  state.metrics = metrics
  state.heat = heat
  if (heat > state.heatPeak) state.heatPeak = heat
  return { ...orb, admitted: true }
}

// Step the simulation forward by dtMs. Advances orb progress, spawns new
// orbs, runs gate checks, and detects wave resolution.
export function step(state: GameState, now: number, dtMs: number): GameState {
  if (state.phase !== "running") return state
  // Spawn pending orbs.
  spawnNextOrb(state, now)
  // Advance each orb along the corridor.
  const advance = dtMs / CORRIDOR_TRANSIT_MS
  let mutated = false
  state.orbs = state.orbs.map((orb) => {
    if (orb.rejected || orb.admitted) return orb
    const nextProgress = Math.min(1, orb.progress + advance)
    if (nextProgress === orb.progress) return orb
    mutated = true
    return advanceOrbThroughGates(state, { ...orb, progress: nextProgress }, now)
  })
  // A rejected orb still contributes a false-deny if it was legit.
  for (const orb of state.orbs) {
    if (orb.rejected && orb.isLegit) {
      // Count each legit reject exactly once.
      const already = state.metrics.legit_rejected
      // Only heat up if this is a new event (we re-apply on every step).
      if (already < countLegitRejected(state.orbs)) {
        state.metrics = { ...state.metrics, legit_rejected: already + 1 }
        state.heat += HEAT_PER_FALSE_DENY
        if (state.heat > state.heatPeak) state.heatPeak = state.heat
      }
    }
  }
  void mutated
  return maybeResolve(state, now)
}

function countLegitRejected(orbs: readonly Orb[]): number {
  return orbs.filter((o) => o.rejected && o.isLegit).length
}

// Wave resolves when every spawned orb has reached a terminal state.
function maybeResolve(state: GameState, now: number): GameState {
  if (state.phase !== "running") return state
  if (state.spawnedCount < WAVE_ORBS.length) return state
  const allResolved = state.orbs.every((o) => o.rejected || o.admitted)
  if (!allResolved) return state
  state.phase = "resolved"
  state.resolvedAt = now
  const correctOrder =
    state.gateOrder.length === CANONICAL_ORDER.length &&
    state.gateOrder.every((g, i) => g === CANONICAL_ORDER[i])
  const m: Metrics = {
    ...state.metrics,
    gate_order: [...state.gateOrder],
    correct_order: correctOrder,
    heat_peak: state.heatPeak,
    overheated: state.heatPeak >= MAX_HEAT,
  }
  state.metrics = m
  state.pass = isWin(m)
  return state
}

// Pass rule (matches PLAN §6 + §11): canonical order AND every breach class
// zero AND at most one legit reject AND no overheat.
export function isWin(m: Metrics): boolean {
  return (
    m.correct_order &&
    m.forged_admitted === 0 &&
    m.expired_admitted === 0 &&
    m.wrong_audience_admitted === 0 &&
    m.missing_token_admitted === 0 &&
    m.forbidden_reached_handler === 0 &&
    m.malformed_admitted === 0 &&
    m.wrong_version_admitted === 0 &&
    m.legit_rejected <= 1 &&
    !m.overheated
  )
}

// Reset the chain back to compose phase for the next wave attempt.
export function resetForRecompose(state: GameState, now: number): GameState {
  state.phase = "compose"
  state.dockRemaining = [...INITIAL_DOCK_ORDER]
  state.gateOrder = []
  state.dockSelectedIndex = 0
  state.orbs = []
  state.spawnedCount = 0
  state.nextSpawnAt = now
  state.metrics = emptyMetrics(state.wave)
  state.startedAt = now
  state.resolvedAt = null
  state.heat = 0
  state.heatPeak = 0
  state.pass = false
  return state
}
