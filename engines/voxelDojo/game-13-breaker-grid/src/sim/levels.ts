import {
  burst,
  type CircuitState,
  type District,
  makeDistrict,
  type RequestEvent,
  serveRequest,
  simulateWave,
} from "./breaker"
import { mulberry32 } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  seed: number
  /** district ids that exist on this level's grid */
  districtIds: string[]
  /** breaker policy shared by all districts on this level */
  failureThreshold: number
  cooldownMs: number
  halfOpenProbes: number
  /** bulkhead concurrency cap per district */
  cap: number
  /** human-facing pass rule */
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Trip the breaker",
    lesson:
      "N consecutive failures trip a district's breaker OPEN. Once OPEN, requests fail-fast — they never reach the downstream.",
    seed: 11,
    districtIds: ["payments", "search"],
    failureThreshold: 3,
    cooldownMs: 1000,
    halfOpenProbes: 1,
    cap: 8,
    passRule: "Inject failures into the failing district, then predict which breaker trips OPEN.",
  },
  {
    id: "L2",
    title: "Cooldown + probe",
    lesson:
      "After a cooldown, a breaker goes HALF_OPEN and admits one probe. Success → CLOSED, failure → OPEN again.",
    seed: 22,
    districtIds: ["payments", "search"],
    failureThreshold: 3,
    cooldownMs: 1000,
    halfOpenProbes: 1,
    cap: 8,
    passRule: "Advance the clock past the cooldown, then predict the half-open probe outcome.",
  },
  {
    id: "L3",
    title: "Bulkhead",
    lesson:
      "A bulkhead caps concurrent calls per district. A full district rejects overflow — isolation, not starvation.",
    seed: 33,
    districtIds: ["payments", "search", "shipping"],
    failureThreshold: 5,
    cooldownMs: 1000,
    halfOpenProbes: 1,
    cap: 2,
    passRule:
      "Saturate a district up to its cap, then predict how many requests the bulkhead rejects.",
  },
  {
    id: "L4",
    title: "Cascade prevention",
    lesson:
      "Without breakers, a failing district drags down the whole grid. With them, the failing district is isolated and the others keep serving.",
    seed: 44,
    districtIds: ["payments", "search", "shipping", "auth"],
    failureThreshold: 3,
    cooldownMs: 2000,
    halfOpenProbes: 1,
    cap: 8,
    passRule:
      "Predict which districts keep serving after one district fails — the breaker isolates it.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

/** Build fresh districts for a level (all breakers CLOSED, no in-flight calls). */
export function districtsFor(cfg: LevelConfig): District[] {
  return cfg.districtIds.map((id) =>
    makeDistrict(id, {
      failureThreshold: cfg.failureThreshold,
      cooldownMs: cfg.cooldownMs,
      halfOpenProbes: cfg.halfOpenProbes,
      cap: cfg.cap,
    }),
  )
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean>
}

// ─── L1: predict the breaker state after a failure wave ──────────────────────

/**
 * L1 — the player injects failures into one district and predicts its final
 * breaker state. Pass iff the predicted state matches the simulated truth
 * (and the predicted tripped district is the one that actually tripped).
 */
export function evaluateTrip(
  cfg: LevelConfig,
  failingDistrictId: string,
  failures: number,
  predictedState: CircuitState,
  predictedTrippedId: string | null,
): WaveOutcome {
  const districts = districtsFor(cfg)
  const events = burst(failingDistrictId, failures, "failure", 0)
  const { districts: after } = simulateWave(districts, events)
  const tripped = after.find((d) => d.breaker.state === "open") ?? null
  const actualState = after.find((d) => d.id === failingDistrictId)?.breaker.state ?? "closed"
  const stateOk = predictedState === actualState
  const actualTrippedId = tripped?.id ?? null
  const trippedOk =
    predictedTrippedId === null ? actualTrippedId === null : predictedTrippedId === actualTrippedId
  return {
    pass: stateOk && trippedOk,
    metrics: {
      failing_district: failingDistrictId as unknown as number,
      failures_injected: failures,
      predicted_state: predictedState as unknown as number,
      actual_state: actualState as unknown as number,
      tripped_district_ok: trippedOk,
      threshold: cfg.failureThreshold,
    },
  }
}

// ─── L2: predict the half-open probe outcome ────────────────────────────────

/**
 * L2 — the player predicts whether a HALF_OPEN probe will CLOSE (success) or
 * re-OPEN (failure) the breaker. The level trips the breaker first (failures),
 * advances the clock past the cooldown (→ half_open), then runs one probe.
 */
export function evaluateProbe(
  cfg: LevelConfig,
  districtId: string,
  probeOutcome: "success" | "failure",
  predictedFinal: CircuitState,
): WaveOutcome {
  const districts = districtsFor(cfg)
  const tripEvents = burst(districtId, cfg.failureThreshold, "failure", 0)
  // clock advances well past cooldown to flip to half_open
  const probeAt = cfg.cooldownMs + 500
  const probeEvents: RequestEvent[] = [
    ...tripEvents,
    { districtId, downstream: probeOutcome, at: probeAt },
  ]
  const { districts: after } = simulateWave(districts, probeEvents)
  const actualFinal = after.find((d) => d.id === districtId)?.breaker.state ?? "closed"
  const ok = predictedFinal === actualFinal
  return {
    pass: ok,
    metrics: {
      probe_outcome: probeOutcome === "success" ? 1 : 0,
      predicted_final: predictedFinal as unknown as number,
      actual_final: actualFinal as unknown as number,
      probe_prediction_ok: ok,
    },
  }
}

// ─── L3: predict bulkhead rejections ─────────────────────────────────────────

/**
 * L3 — the player predicts how many requests the bulkhead will reject when a
 * burst larger than `cap` is fired at one district (breaker kept CLOSED).
 * The calls are SLOW (they hold their slots long enough to overlap), so the
 * burst genuinely saturates the bulkhead: rejected = max(0, count - cap).
 * Pass iff the predicted rejected count is exactly right.
 */
export function evaluateBulkhead(
  cfg: LevelConfig,
  districtId: string,
  requestCount: number,
  predictedRejected: number,
): WaveOutcome {
  const districts = districtsFor(cfg)
  // slow successful calls (step 1ms, duration 1000ms) all overlap → pile up at the cap
  const fast = burst(districtId, requestCount, "success", 0, 1).map((e) => ({
    ...e,
    durationMs: 1000,
  }))
  const { stats, districts: after } = simulateWave(districts, fast)
  const actualRejected = stats.perDistrict[districtId]?.bulkheadRejected ?? 0
  const ok = predictedRejected === actualRejected
  const stateAfter = after.find((d) => d.id === districtId)?.breaker.state ?? "closed"
  return {
    pass: ok && stateAfter === "closed",
    metrics: {
      requests: requestCount,
      cap: cfg.cap,
      predicted_rejected: predictedRejected,
      actual_rejected: actualRejected,
      rejection_prediction_ok: ok,
      breaker_state_after: stateAfter as unknown as number,
    },
  }
}

// ─── L4: predict which districts keep serving (cascade prevention) ───────────

/**
 * L4 — one district fails hard; its breaker isolates it. The player predicts
 * the set of districts that KEEP SERVING (remain CLOSED and serve ≥1 request).
 * Pass iff that set matches the simulated truth.
 */
export function evaluateCascade(
  cfg: LevelConfig,
  failingDistrictId: string,
  predictedStillServing: readonly string[],
): WaveOutcome {
  const districts = districtsFor(cfg)
  const rng = mulberry32(cfg.seed)
  const events: RequestEvent[] = []
  let t = 0
  // failing district hammered with failures → trips OPEN
  for (let i = 0; i < cfg.failureThreshold + 2; i++) {
    events.push({ districtId: failingDistrictId, downstream: "failure", at: t })
    t += 5
  }
  // surplus to the failing district get short-circuited
  for (let i = 0; i < 3; i++) {
    events.push({ districtId: failingDistrictId, downstream: "success", at: t })
    t += 5
  }
  // every other district receives successful traffic and keeps serving
  for (const id of cfg.districtIds) {
    if (id === failingDistrictId) continue
    const n = 3 + Math.floor(rng() * 3)
    for (let i = 0; i < n; i++) {
      events.push({ districtId: id, downstream: "success", at: t })
      t += 5
    }
  }
  const { stats } = simulateWave(districts, events)
  const actualStillServing = cfg.districtIds.filter((id) => {
    const s = stats.perDistrict[id]
    return s && id !== failingDistrictId && s.state === "closed" && s.served > 0
  })
  const predictedSet = new Set(predictedStillServing)
  const actualSet = new Set(actualStillServing)
  const ok =
    predictedSet.size === actualSet.size && [...predictedSet].every((id) => actualSet.has(id))
  return {
    pass: ok,
    metrics: {
      failing_district: failingDistrictId as unknown as number,
      predicted_still_serving: predictedStillServing.length,
      actual_still_serving: actualStillServing.length,
      still_serving_prediction_ok: ok,
      total_served: stats.totalServed,
      total_short_circuited: stats.totalShortCircuited,
      cascade_prevented: actualStillServing.length === cfg.districtIds.length - 1,
    },
  }
}

/** Deterministic burst builder exposed for the controller / smoke hook. */
export function makeBurst(
  districtId: string,
  count: number,
  downstream: "success" | "failure",
  baseTime = 0,
  stepMs = 5,
): RequestEvent[] {
  return burst(districtId, count, downstream, baseTime, stepMs)
}

/** Advance one district's breaker by one service event — used by the interactive scene clicks. */
export function serveOne(d: District, downstream: "success" | "failure", now: number): District {
  return serveRequest(d, downstream, now).district
}
