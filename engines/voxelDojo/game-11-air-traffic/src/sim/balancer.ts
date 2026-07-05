import type { RequestSpec, Rng } from "./rng"

/**
 * Headless load-balancer sim core. NO `three` import — pure TypeScript, deterministic with an
 * injected RNG. The scene only renders state produced here.
 *
 * The ONE concept: a routing policy (round-robin / least-connections / random) chooses which
 * backend serves each request, AND health (healthy/unhealthy) gates that choice — an unhealthy
 * backend is removed from rotation and re-added on recovery.
 */

export type Policy = "round_robin" | "least_connections" | "random"
export type Health = "healthy" | "unhealthy"

export interface Backend {
  id: string
  health: Health
  /** currently open connections — drives least-connections and reflects live load. */
  connections: number
  /** total requests ever routed here (whether they errored or not). */
  routed: number
  /** requests routed here while it was unhealthy — the errors we are trying to avoid. */
  errors: number
}

/** Mutable per-pod routing state that survives across calls (round-robin cursor, etc.). */
export interface RouterState {
  /** next round-robin index into the full backend list (skips unhealthy at route time). */
  rrCursor: number
}

export function makeBackend(id: string): Backend {
  return { id, health: "healthy", connections: 0, routed: 0, errors: 0 }
}

export function makeRouter(): RouterState {
  return { rrCursor: 0 }
}

/** Backends eligible to receive traffic = healthy ones. Unhealthy backends are out of rotation. */
export function healthyBackends(backends: readonly Backend[]): Backend[] {
  return backends.filter((b) => b.health === "healthy")
}

/**
 * Choose the backend for one request under the given policy. Health-aware: only `healthy` backends
 * are candidates; if none are healthy the route fails and returns null (a dropped request).
 *
 * Side effects on the chosen backend (connections, routed) and on `state.rrCursor` are applied
 * in-place so callers can stream many requests through one router. `request.cost` is the connection
 * weight added on arrival (released later by `release`).
 */
export function policyRoute(
  policy: Policy,
  request: RequestSpec,
  backends: readonly Backend[],
  state: RouterState,
): Backend | null {
  const live = healthyBackends(backends)
  if (live.length === 0) return null // no healthy backend ⇒ dropped request

  let chosen: Backend
  if (policy === "round_robin") {
    // Advance the global cursor to the next healthy backend in original-index order.
    chosen = live[state.rrCursor % live.length] as Backend
    state.rrCursor = (state.rrCursor + 1) % live.length
  } else if (policy === "least_connections") {
    chosen = pickMinConnections(live)
  } else {
    // random — caller injects determinism through the request stream's rng elsewhere; here we
    // route to the live backend whose selection is stable given the request id hash so the sim
    // is fully deterministic without threading an rng into every route call. See routeWave for
    // the seeded-random variant used by level play.
    chosen = live[Math.floor((stableHash(request.id) / 0x100000000) * live.length)] as Backend
  }

  chosen.connections += request.cost
  chosen.routed += 1
  return chosen
}

/**
 * Stream a whole wave of requests through the router under one policy, deterministically. This is
 * the function levels evaluate: it produces the per-backend load, the error count (routes that
 * landed on unhealthy backends because the player chose to ignore health), and the load skew.
 *
 * `routeOverride` lets a level force a specific backend for a request (the player's *prediction* of
 * where the policy sends it). When the override targets an unhealthy backend, that counts as an
 * error — the pedagogical sting of ignoring health checks.
 */
export interface RouteResult {
  assignments: Map<string, string> // requestId -> backendId ("dropped" if no healthy backend)
  errors: number
  dropped: number
  load: Map<string, number> // backendId -> routed count (healthy + unhealthy)
  skew: number // max load / mean load across ALL backends (1.0 = perfect)
}

export function routeWave(args: {
  policy: Policy
  requests: readonly RequestSpec[]
  backends: Backend[]
  state: RouterState
  rng: Rng
  /** optional per-request forced backend id (player prediction). Keys are request ids. */
  overrides?: ReadonlyMap<string, string>
}): RouteResult {
  const { policy, requests, backends, state, rng, overrides } = args
  const assignments = new Map<string, string>()
  let errors = 0
  let dropped = 0

  for (const req of requests) {
    const overrideId = overrides?.get(req.id)
    if (overrideId) {
      const target = backends.find((b) => b.id === overrideId)
      if (!target) {
        dropped++
        assignments.set(req.id, "dropped")
        continue
      }
      target.connections += req.cost
      target.routed += 1
      if (target.health === "unhealthy") target.errors += 1
      assignments.set(req.id, target.id)
      continue
    }

    if (policy === "random") {
      // Seeded random route: pick a uniform healthy backend using the injected rng.
      const live = healthyBackends(backends)
      if (live.length === 0) {
        dropped++
        assignments.set(req.id, "dropped")
        continue
      }
      const chosen = live[Math.floor(rng() * live.length)] as Backend
      chosen.connections += req.cost
      chosen.routed += 1
      assignments.set(req.id, chosen.id)
    } else {
      const chosen = policyRoute(policy, req, backends, state)
      if (!chosen) {
        dropped++
        assignments.set(req.id, "dropped")
      } else {
        assignments.set(req.id, chosen.id)
      }
    }
  }

  const load = loadOf(backends)
  const skew = loadSkew(load)
  // Errors are routes that hit an unhealthy backend (only possible via overrides — the policy
  // itself never picks an unhealthy backend, which is the whole point of health checks).
  for (const b of backends) errors += b.errors
  return { assignments, errors, dropped, load, skew }
}

/**
 * Health probe: stochastically flip a backend's health. `failProb` is the chance a healthy backend
 * goes unhealthy on this probe; `recoverProb` is the chance an unhealthy one recovers. Returns the
 * backend's new health. This is how dead pads are discovered and how recovered pads re-enter.
 */
export function probe(backend: Backend, rng: Rng, failProb: number, recoverProb: number): Health {
  if (backend.health === "healthy") {
    if (rng() < failProb) backend.health = "unhealthy"
  } else if (rng() < recoverProb) {
    backend.health = "healthy"
  }
  return backend.health
}

/** Release a request's connections from its pad (a request finished serving). */
export function release(backend: Backend, cost: number): void {
  backend.connections = Math.max(0, backend.connections - cost)
}

/** Per-backend routed counts. Backends with zero routes are included. */
export function loadOf(backends: readonly Backend[]): Map<string, number> {
  return new Map(backends.map((b) => [b.id, b.routed]))
}

/** Load skew = max backend load / mean backend load. 1.0 is perfect balance. */
export function loadSkew(load: Map<string, number>): number {
  const counts = [...load.values()]
  if (counts.length === 0) throw new Error("no backends")
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length
  if (mean === 0) return 1
  return Math.max(...counts) / mean
}

function pickMinConnections(live: Backend[]): Backend {
  let best = live[0]
  if (!best) throw new Error("no live backends")
  for (const b of live) {
    if (b.connections < best.connections) best = b
  }
  return best
}

/** Stable 32-bit hash of a string (FNV-1a) — used for the deterministic non-random fallback. */
function stableHash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
