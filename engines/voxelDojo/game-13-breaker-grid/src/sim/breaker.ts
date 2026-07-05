/**
 * Circuit-breaker + bulkhead simulation core.
 *
 * HEADLESS & DETERMINISTIC — zero three imports, no DOM, no wall clock.
 * The clock is injected (`now: number`) so every transition is replayable.
 * The Three.js scene in src/scene only renders snapshots of this state.
 *
 * The ONE concept: a circuit breaker fails fast instead of piling up timeouts.
 *   closed   → requests pass; N consecutive failures trip OPEN
 *   open     → requests are short-circuited (fail-fast, no downstream call);
 *              after a cooldown a single HALF_OPEN probe re-tests the dependency
 *   half_open→ one probe passes; success → CLOSED, failure → OPEN again
 * A bulkhead caps concurrent (in-flight) calls per district so one slow/failing
 * district cannot starve the others.
 */

export type CircuitState = "closed" | "open" | "half_open"

/** A breaker carries its own config so `stepBreaker(b, event)` is self-contained. */
export interface Breaker {
  districtId: string
  state: CircuitState
  /** consecutive downstream failures while CLOSED (resets on any success) */
  consecutiveFailures: number
  /** trips OPEN when consecutiveFailures reaches this */
  failureThreshold: number
  /** OPEN → wait cooldownMs → HALF_OPEN */
  cooldownMs: number
  /** how many probe requests HALF_OPEN lets through before re-evaluating (usually 1) */
  halfOpenProbes: number
  /** clock value at which it tripped OPEN (null while never opened) */
  openedAt: number | null
  /** probes dispatched during the current HALF_OPEN cycle (reset on each OPEN↔HALF_OPEN change) */
  halfOpenDispatched: number
  /** lifetime count of times this breaker has tripped OPEN (for metrics/visuals) */
  trips: number
}

/** Event driving a pure state transition. `now` is the injected clock value. */
export type BreakerEvent =
  | { type: "success"; now: number }
  | { type: "failure"; now: number }
  | { type: "tick"; now: number }

/** A district = one dependency behind a breaker + a bulkhead concurrency cap. */
export interface District {
  id: string
  breaker: Breaker
  /** concurrent calls currently admitted and in-flight downstream */
  inFlight: number
  /** bulkhead cap: at most `cap` calls in-flight at once; overflow is rejected */
  cap: number
  /** clock values at which each in-flight call completes (and frees its slot) */
  completesAt: number[]
}

/** Result of routing one request through a breaker (after any cooldown transition). */
export interface RouteResult {
  /** request was allowed through to the downstream service */
  passed: boolean
  /** breaker short-circuited it: fail-fast, no downstream call made */
  shortCircuited: boolean
  /** this call consumed a HALF_OPEN probe slot */
  isProbe: boolean
  state: CircuitState
}

/** A scripted request in a wave: which district, the downstream outcome IF reached, arrival time. */
export interface RequestEvent {
  districtId: string
  /** what the downstream returns if the request actually reaches it */
  downstream: "success" | "failure"
  /** injected clock value (ms) at which this request arrives */
  at: number
  /** how long the downstream holds its bulkhead slot before completing (default 0 = instant) */
  durationMs?: number
}

/** Aggregate outcome of a simulated wave — what levels.ts evaluates against predictions. */
export interface WaveStats {
  perDistrict: Record<
    string,
    {
      state: CircuitState
      served: number
      failed: number
      shortCircuited: number
      bulkheadRejected: number
      trips: number
      inFlight: number
    }
  >
  totalServed: number
  totalFailed: number
  totalShortCircuited: number
  totalBulkheadRejected: number
}

// ─── factory ──────────────────────────────────────────────────────────────────

export function makeBreaker(
  districtId: string,
  cfg: { failureThreshold?: number; cooldownMs?: number; halfOpenProbes?: number } = {},
): Breaker {
  return {
    districtId,
    state: "closed",
    consecutiveFailures: 0,
    failureThreshold: cfg.failureThreshold ?? 3,
    cooldownMs: cfg.cooldownMs ?? 1000,
    halfOpenProbes: cfg.halfOpenProbes ?? 1,
    openedAt: null,
    halfOpenDispatched: 0,
    trips: 0,
  }
}

export function makeDistrict(
  id: string,
  opts: {
    failureThreshold?: number
    cooldownMs?: number
    halfOpenProbes?: number
    cap?: number
  } = {},
): District {
  return {
    id,
    breaker: makeBreaker(id, opts),
    inFlight: 0,
    cap: opts.cap ?? 4,
    completesAt: [],
  }
}

// ─── the state machine (pure) ─────────────────────────────────────────────────

/**
 * Pure transition. Returns a NEW breaker; never mutates the input.
 *   failure (CLOSED)  → consecutiveFailures++; at threshold → OPEN (openedAt=now, trips++)
 *   failure (HALF_OPEN)→ probe failed → OPEN again (openedAt=now, trips++)
 *   success (CLOSED)  → consecutiveFailures = 0
 *   success (HALF_OPEN)→ probe passed → CLOSED
 *   tick              → if OPEN and now-openedAt ≥ cooldownMs → HALF_OPEN (reset probes)
 * OPEN ignores success/failure (no downstream call reaches it; use tick for cooldown).
 */
export function stepBreaker(b: Breaker, event: BreakerEvent): Breaker {
  switch (event.type) {
    case "tick": {
      if (b.state === "open" && b.openedAt !== null && event.now - b.openedAt >= b.cooldownMs) {
        return { ...b, state: "half_open", halfOpenDispatched: 0 }
      }
      return b
    }
    case "failure": {
      if (b.state === "half_open") {
        // probe failed → re-trip OPEN immediately
        return {
          ...b,
          state: "open",
          openedAt: event.now,
          consecutiveFailures: b.consecutiveFailures + 1,
          halfOpenDispatched: 0,
          trips: b.trips + 1,
        }
      }
      if (b.state === "closed") {
        const failures = b.consecutiveFailures + 1
        if (failures >= b.failureThreshold) {
          return {
            ...b,
            state: "open",
            consecutiveFailures: failures,
            openedAt: event.now,
            halfOpenDispatched: 0,
            trips: b.trips + 1,
          }
        }
        return { ...b, consecutiveFailures: failures }
      }
      return b // OPEN: a failure event shouldn't arrive (no downstream call), ignore
    }
    case "success": {
      if (b.state === "half_open") {
        // probe passed → recovered
        return { ...b, state: "closed", consecutiveFailures: 0, halfOpenDispatched: 0 }
      }
      if (b.state === "closed") {
        return { ...b, consecutiveFailures: 0 }
      }
      return b // OPEN: ignore (no downstream call reaches it)
    }
  }
}

// ─── cooldown-aware routing (pure) ────────────────────────────────────────────

/**
 * Apply any pending cooldown transition, then decide whether a request passes.
 * Returns the (possibly transitioned) breaker and the routing result.
 *
 *   closed    → pass through (downstream will be called)
 *   open      → if cooldown elapsed, become half_open first, then route as half_open;
 *               otherwise FAIL-FAST short-circuit (no downstream call)
 *   half_open → if a probe slot is free, pass one probe through; else FAIL-FAST
 */
export function routeRequest(b: Breaker, now: number): { breaker: Breaker; result: RouteResult } {
  let cur = stepBreaker(b, { type: "tick", now })
  if (cur.state === "closed") {
    return {
      breaker: cur,
      result: { passed: true, shortCircuited: false, isProbe: false, state: "closed" },
    }
  }
  if (cur.state === "open") {
    // still in cooldown — fail fast
    return {
      breaker: cur,
      result: { passed: false, shortCircuited: true, isProbe: false, state: "open" },
    }
  }
  // half_open: limited probes
  if (cur.halfOpenDispatched < cur.halfOpenProbes) {
    cur = { ...cur, halfOpenDispatched: cur.halfOpenDispatched + 1 }
    return {
      breaker: cur,
      result: { passed: true, shortCircuited: false, isProbe: true, state: "half_open" },
    }
  }
  // probe already in flight / exhausted — fail fast the surplus
  return {
    breaker: cur,
    result: { passed: false, shortCircuited: true, isProbe: false, state: "half_open" },
  }
}

// ─── bulkhead (pure) ──────────────────────────────────────────────────────────

/**
 * Try to admit one more in-flight call to a district capped at `cap`.
 * Pure: returns the new in-flight count and whether it was admitted.
 *   inFlight < cap → admitted, inFlight+1
 *   inFlight ≥ cap → rejected (fail-fast at the bulkhead wall), inFlight unchanged
 */
export function bulkheadAcquire(
  inFlight: number,
  cap: number,
): { admitted: boolean; rejected: boolean; inFlight: number } {
  if (inFlight < cap) {
    return { admitted: true, rejected: false, inFlight: inFlight + 1 }
  }
  return { admitted: false, rejected: true, inFlight }
}

export function bulkheadRelease(inFlight: number): number {
  return Math.max(0, inFlight - 1)
}

/**
 * Release every in-flight call whose completion time has passed by `now`.
 * Pure. This is what makes a bulkhead observable: a burst of slow calls piles
 * up in-flight, and only drains as the clock advances past their durations.
 */
export function sweepCompletions(d: District, now: number): District {
  if (d.completesAt.length === 0) return d
  const remaining = d.completesAt.filter((t) => t > now)
  if (remaining.length === d.completesAt.length) return d
  return { ...d, completesAt: remaining, inFlight: remaining.length }
}

// ─── full request service: breaker + bulkhead composed (pure) ─────────────────

export interface ServeResult {
  district: District
  /** request reached the downstream and got a real result */
  served: boolean
  /** downstream returned failure (only counts when served) */
  failed: boolean
  /** breaker fail-fasted it (no downstream call) */
  shortCircuited: boolean
  /** bulkhead rejected it before the breaker (no downstream call) */
  bulkheadRejected: boolean
}

/**
 * Serve one request through a district's bulkhead then its breaker.
 *   1. bulkhead: if at cap → rejected (no downstream, no breaker change)
 *   2. breaker route: if short-circuited → fail-fast (no downstream)
 *   3. else the downstream is called with the scripted outcome; the breaker
 *      records success/failure (which may trip or recover it). The slot is held
 *      for `durationMs` (default 0 = completes immediately) and freed by
 *      `sweepCompletions` as the clock advances.
 * Pure: returns the updated district + flags.
 */
export function serveRequest(
  d: District,
  downstream: "success" | "failure",
  now: number,
  durationMs = 0,
): ServeResult {
  const acq = bulkheadAcquire(d.inFlight, d.cap)
  if (acq.rejected) {
    return {
      district: { ...d, inFlight: acq.inFlight },
      served: false,
      failed: false,
      shortCircuited: false,
      bulkheadRejected: true,
    }
  }
  let district: District = { ...d, inFlight: acq.inFlight }
  const { breaker: routed, result } = routeRequest(district.breaker, now)
  district = { ...district, breaker: routed }
  if (result.shortCircuited) {
    // fail-fast: the call never went downstream, so it's no longer in-flight
    district = { ...district, inFlight: bulkheadRelease(district.inFlight) }
    return { district, served: false, failed: false, shortCircuited: true, bulkheadRejected: false }
  }
  // downstream was actually called; the slot is held until `now + durationMs`
  const next = stepBreaker(district.breaker, { type: downstream, now })
  const completesAt =
    durationMs > 0 ? [...district.completesAt, now + durationMs] : district.completesAt
  district = {
    ...district,
    breaker: next,
    completesAt,
    inFlight: completesAt.length,
  }
  return {
    district,
    served: true,
    failed: downstream === "failure",
    shortCircuited: false,
    bulkheadRejected: false,
  }
}

// ─── wave simulation (pure, deterministic) ────────────────────────────────────

/**
 * Replay a scripted wave of requests against a set of districts and return
 * aggregate stats. Events are processed in order; `at` is the injected clock
 * value used for cooldown transitions. This is the function levels.ts evaluates
 * predictions against — it has no RNG and no wall clock, so replays are exact.
 */
export function simulateWave(
  districts: readonly District[],
  events: readonly RequestEvent[],
): { districts: District[]; stats: WaveStats } {
  const byId = new Map(districts.map((d) => [d.id, d]))
  const stats: WaveStats["perDistrict"] = {}
  for (const d of districts) {
    stats[d.id] = {
      state: d.breaker.state,
      served: 0,
      failed: 0,
      shortCircuited: 0,
      bulkheadRejected: 0,
      trips: d.breaker.trips,
      inFlight: d.inFlight,
    }
  }
  let totalServed = 0
  let totalFailed = 0
  let totalShortCircuited = 0
  let totalBulkheadRejected = 0

  for (const ev of events) {
    const d = byId.get(ev.districtId)
    if (!d) continue
    // drain any in-flight slots whose completion time has passed by ev.at,
    // so a burst of slow calls piles up only while they overlap in time.
    const drained = sweepCompletions(d, ev.at)
    const out = serveRequest(drained, ev.downstream, ev.at, ev.durationMs ?? 0)
    byId.set(ev.districtId, out.district)
    const s = stats[ev.districtId]
    if (!s) continue
    if (out.served) {
      s.served++
      totalServed++
      if (out.failed) {
        s.failed++
        totalFailed++
      }
    } else if (out.shortCircuited) {
      s.shortCircuited++
      totalShortCircuited++
    } else if (out.bulkheadRejected) {
      s.bulkheadRejected++
      totalBulkheadRejected++
    }
    s.state = out.district.breaker.state
    s.trips = out.district.breaker.trips
    s.inFlight = out.district.inFlight
  }

  const finalDistricts = districts.map((orig) => byId.get(orig.id) ?? orig)
  for (const d of finalDistricts) {
    const s = stats[d.id]
    if (s) s.state = d.breaker.state
  }
  return {
    districts: finalDistricts,
    stats: {
      perDistrict: stats,
      totalServed,
      totalFailed,
      totalShortCircuited,
      totalBulkheadRejected,
    },
  }
}

// ─── small deterministic helpers for building waves ───────────────────────────

/** A run of `count` requests to one district with a fixed outcome, at base+step clock. */
export function burst(
  districtId: string,
  count: number,
  downstream: "success" | "failure",
  baseTime = 0,
  stepMs = 10,
): RequestEvent[] {
  const out: RequestEvent[] = []
  for (let i = 0; i < count; i++) {
    out.push({ districtId, downstream, at: baseTime + i * stepMs })
  }
  return out
}
