// Pure routing logic for the Traffic Forge dispatcher. No DOM, no three.js.
// Tested in isolation by dispatcher.test.ts.
//
// Algorithms (PLAN slice §3):
//   - round_robin     : rotating pointer, advance by 1 per shot, skip ineligible
//   - least_connections: pick eligible pillar with lowest in-flight orb count
//   - consistent_hash : hash(session) % N → ring slot, walk forward if ineligible
//
// Eligibility = pillar is healthy. Routing NEVER picks an unhealthy/dead pillar;
// dead-route is a metric for player visibility but is structurally prevented.

export type Algorithm = "round_robin" | "least_connections" | "consistent_hash"
export type OrbShape = "plain" | "heavy" | "sticky"
export type Health = "healthy" | "unhealthy" | "dead"

export type Pillar = {
  id: number
  health: Health
  inflight: number
  inflightHeavy: number
}

export type Orb = {
  id: number
  shape: OrbShape
  session: string | null
}

export type DispatchState = {
  pillars: Pillar[]
  // Index of the last pillar chosen by round-robin. -1 = "none yet" (so the
  // first RR shot lands on pillar 0).
  rrPointer: number
}

export type PickOutcome =
  | { readonly kind: "routed"; readonly pillarId: number }
  | { readonly kind: "no_eligible" }

export const PILLAR_COUNT = 6
export const HEAVY_CAP = 1
// PLAN slice §4.1: "one pillar is pre-marked red (unhealthy) so the player
// must respect eligibility from the first shot."
export const INITIAL_UNHEALTHY_PILLAR = 2

export function createPillars(
  count: number = PILLAR_COUNT,
  unhealthyIndex: number = INITIAL_UNHEALTHY_PILLAR,
): Pillar[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    health: i === unhealthyIndex ? "unhealthy" : "healthy",
    inflight: 0,
    inflightHeavy: 0,
  }))
}

export function createDispatchState(): DispatchState {
  return {
    pillars: createPillars(),
    rrPointer: -1,
  }
}

export function pillarEligible(p: Pillar): boolean {
  return p.health === "healthy"
}

// FNV-1a 32-bit, then mod N. Stable for the same session string. Exposed for
// the HUD hash-preview and the unit tests.
export function hashSession(session: string, mod: number): number {
  let h = 2166136261
  for (let i = 0; i < session.length; i += 1) {
    h ^= session.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % mod
}

// Choose a pillar for `orb` under `algorithm`. PURE: does not mutate state.
// RR tie-break = advance from rrPointer; LC tie-break = lowest id (stable).
export function pickPillar(state: DispatchState, orb: Orb, algorithm: Algorithm): PickOutcome {
  const pillars = state.pillars
  const N = pillars.length
  if (N === 0) {
    return { kind: "no_eligible" }
  }

  if (algorithm === "round_robin") {
    for (let step = 1; step <= N; step += 1) {
      const idx = (state.rrPointer + step) % N
      const candidate = pillars[idx]
      if (candidate !== undefined && pillarEligible(candidate)) {
        return { kind: "routed", pillarId: idx }
      }
    }
    return { kind: "no_eligible" }
  }

  if (algorithm === "least_connections") {
    let minInflight = Number.POSITIVE_INFINITY
    for (const p of pillars) {
      if (pillarEligible(p) && p.inflight < minInflight) {
        minInflight = p.inflight
      }
    }
    if (!Number.isFinite(minInflight)) {
      return { kind: "no_eligible" }
    }
    // Tie-break: lowest id among eligible pillars at minInflight. Deterministic
    // and predictable for the player.
    for (let i = 0; i < N; i += 1) {
      const p = pillars[i]
      if (p !== undefined && pillarEligible(p) && p.inflight === minInflight) {
        return { kind: "routed", pillarId: i }
      }
    }
    return { kind: "no_eligible" }
  }

  // consistent_hash
  if (orb.session === null) {
    // Sticky algorithm fired without a session — fall back to RR. (Wave
    // designs always pair sticky orbs with a session.)
    return pickPillar(state, orb, "round_robin")
  }
  const slot = hashSession(orb.session, N)
  for (let step = 0; step < N; step += 1) {
    const idx = (slot + step) % N
    const p = pillars[idx]
    if (p !== undefined && pillarEligible(p)) {
      return { kind: "routed", pillarId: idx }
    }
  }
  return { kind: "no_eligible" }
}

// Commit a routing decision: advance rrPointer (RR only) and bump in-flight
// counters. Mutates state. Caller must guarantee `pillarId` was the chosen one.
export function commitRouting(
  state: DispatchState,
  orb: Orb,
  algorithm: Algorithm,
  pillarId: number,
): void {
  const p = state.pillars[pillarId]
  if (p === undefined) {
    return
  }
  if (algorithm === "round_robin") {
    state.rrPointer = pillarId
  }
  p.inflight += 1
  if (orb.shape === "heavy") {
    p.inflightHeavy += 1
  }
}

export function releaseInflight(state: DispatchState, pillarId: number, shape: OrbShape): void {
  const p = state.pillars[pillarId]
  if (p === undefined) {
    return
  }
  p.inflight = Math.max(0, p.inflight - 1)
  if (shape === "heavy") {
    p.inflightHeavy = Math.max(0, p.inflightHeavy - 1)
  }
}

// Strict shape-vs-algorithm correctness rule (PLAN slice §6 win conditions,
// simplified to a binary gate so the lesson is crisp):
//   - heavy  must use least_connections  (else heavy_overflow)
//   - sticky must use consistent_hash     (else sticky_break)
//   - plain  accepts any algorithm
export function algorithmMatchesShape(shape: OrbShape, algorithm: Algorithm): boolean {
  if (shape === "heavy") {
    return algorithm === "least_connections"
  }
  if (shape === "sticky") {
    return algorithm === "consistent_hash"
  }
  return true
}

// Stable pillar index for a sticky session, accounting for the current health
// mask. Returns the same index pickPillar(CH) would route to.
export function stickyHome(state: DispatchState, session: string): number | null {
  const outcome = pickPillar(state, { id: -1, shape: "sticky", session }, "consistent_hash")
  return outcome.kind === "routed" ? outcome.pillarId : null
}

// Maximum skew (max - min) of in-flight counts across all pillars. Surfaced as
// rr_skew_max in evidence — a healthy RR/LC distribution keeps this low.
export function inflightSkew(pillars: readonly Pillar[]): number {
  if (pillars.length === 0) {
    return 0
  }
  const first = pillars[0]
  let min = first?.inflight ?? 0
  let max = min
  for (const p of pillars) {
    if (p.inflight < min) {
      min = p.inflight
    }
    if (p.inflight > max) {
      max = p.inflight
    }
  }
  return max - min
}
