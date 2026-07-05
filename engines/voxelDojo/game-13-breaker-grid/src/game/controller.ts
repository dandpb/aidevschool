import { emitEvidence } from "../evidence/emit"
import {
  burst,
  type CircuitState,
  type District,
  makeDistrict,
  type RequestEvent,
  routeRequest,
  serveRequest,
  simulateWave,
  stepBreaker,
} from "../sim/breaker"
import {
  districtsFor,
  evaluateBulkhead,
  evaluateCascade,
  evaluateProbe,
  evaluateTrip,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  type WaveOutcome,
} from "../sim/levels"

export type Phase = "briefing" | "injecting" | "predicting" | "resolving" | "cleared" | "failed"

/** A request that has flowed through the grid, kept for the scene to animate. */
export interface FlowRecord {
  id: number
  districtId: string
  outcome: "served" | "failed" | "shortCircuited" | "bulkheadRejected"
  at: number
}

export interface GameState {
  level: LevelConfig
  phase: Phase
  districts: District[]
  /** injected clock — advances on each scripted action so transitions are replayable */
  clock: number
  /** live flow history (most recent first), capped for the scene */
  flows: FlowRecord[]
  /** per-level interaction counters surfaced to the HUD */
  injectedFailures: number
  injectedSuccesses: number
  /** the player's chosen prediction target (district id) where relevant */
  selectedDistrictId: string | null
  /** last evaluation outcome for the metrics panel */
  lastOutcome: WaveOutcome | null
}

export type Listener = (state: GameState) => void

const MAX_FLOWS = 60

/**
 * Drives one concept (circuit breaker + bulkhead) across L1–L4. The deterministic
 * sim lives in src/sim; this controller sequences interactions, exposes a public
 * API the Playwright smoke can drive, and emits evidence on wave clear/fail.
 */
export class GameController {
  private state: GameState
  private listeners: Listener[] = []
  private flowSeq = 0

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    return {
      level: cfg,
      phase: "briefing",
      districts: districtsFor(cfg),
      clock: 0,
      flows: [],
      injectedFailures: 0,
      injectedSuccesses: 0,
      selectedDistrictId: cfg.districtIds[0] ?? null,
      lastOutcome: null,
    }
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  private commit(): void {
    for (const fn of this.listeners) fn(this.state)
  }

  loadLevel(level: LevelId): void {
    this.state = this.freshState(levelConfig(level))
    this.commit()
  }

  nextLevel(): void {
    const idx = LEVELS.findIndex((l) => l.id === this.state.level.id)
    const next = LEVELS[idx + 1]
    if (next) this.loadLevel(next.id)
  }

  start(): void {
    this.state.phase = "injecting"
    this.commit()
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  /** Select a district as the prediction/injection target. */
  selectDistrict(id: string): void {
    this.state.selectedDistrictId = id
    this.commit()
  }

  /** Inject ONE failure into a district (L1/L2/L4). Advances the clock. */
  injectFailure(districtId: string): void {
    if (this.state.phase !== "injecting") return
    this.serve(districtId, "failure")
    this.state.injectedFailures++
    this.commit()
  }

  /** Inject ONE success into a district. Advances the clock. */
  injectSuccess(districtId: string): void {
    if (this.state.phase !== "injecting") return
    this.serve(districtId, "success")
    this.state.injectedSuccesses++
    this.commit()
  }

  /** Move to the prediction step. */
  toPredicting(): void {
    if (this.state.phase !== "injecting") return
    this.state.phase = "predicting"
    this.commit()
  }

  /** Advance the clock by ms (for L2 cooldown demo). */
  advanceClock(ms: number): void {
    this.state.clock += ms
    // apply cooldown transitions to all districts
    this.state.districts = this.state.districts.map((d) => ({
      ...d,
      breaker: stepBreaker(d.breaker, { type: "tick", now: this.state.clock }),
    }))
    this.commit()
  }

  // ─── predictions per level ────────────────────────────────────────────────

  /** L1 — predict the breaker state of the selected district + which tripped. */
  predictTripState(predictedState: CircuitState, predictedTrippedId: string | null): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    const failingId = this.state.selectedDistrictId ?? this.state.level.districtIds[0] ?? ""
    const out = evaluateTrip(
      this.state.level,
      failingId,
      this.state.injectedFailures,
      predictedState,
      predictedTrippedId,
    )
    this.finishWave(out)
  }

  /** L2 — predict the half-open probe final state. Fires the scripted probe. */
  predictProbeOutcome(probe: "success" | "failure", predictedFinal: CircuitState): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    const id = this.state.selectedDistrictId ?? this.state.level.districtIds[0] ?? ""
    const out = evaluateProbe(this.state.level, id, probe, predictedFinal)
    // reflect the probed truth into the live districts so the scene animates it
    this.applyProbeToScene(id, probe)
    this.finishWave(out)
  }

  /** L3 — predict how many the bulkhead rejects for a burst to the selected district. */
  predictBulkheadRejection(requestCount: number, predictedRejected: number): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    const id = this.state.selectedDistrictId ?? this.state.level.districtIds[0] ?? ""
    const out = evaluateBulkhead(this.state.level, id, requestCount, predictedRejected)
    this.applyBurstToScene(id, requestCount, "success")
    this.finishWave(out)
  }

  /** L4 — predict the set of districts that keep serving after one fails. */
  predictCascade(predictedStillServing: readonly string[]): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const failingId = this.state.selectedDistrictId ?? this.state.level.districtIds[0] ?? ""
    const out = evaluateCascade(this.state.level, failingId, predictedStillServing)
    this.applyCascadeToScene(failingId)
    this.finishWave(out)
  }

  // ─── read-only sim access for the scene & smoke hook ───────────────────────

  /** What state would a request to this district see right now (cooldown-aware)? */
  routePreview(districtId: string): CircuitState {
    const d = this.state.districts.find((x) => x.id === districtId)
    if (!d) return "closed"
    const { breaker, result } = routeRequest(d.breaker, this.state.clock)
    void breaker
    return result.state
  }

  districtById(id: string): District | undefined {
    return this.state.districts.find((d) => d.id === id)
  }

  /** Truth helper for the smoke: simulate a full trip wave and report the tripped district. */
  simulateTripWave(
    failingId: string,
    failures: number,
  ): {
    trippedId: string | null
    states: Record<string, CircuitState>
  } {
    const fresh = districtsFor(this.state.level)
    const { districts: after } = simulateWave(fresh, burst(failingId, failures, "failure", 0))
    const tripped = after.find((d) => d.breaker.state === "open") ?? null
    const states: Record<string, CircuitState> = {}
    for (const d of after) states[d.id] = d.breaker.state
    return { trippedId: tripped?.id ?? null, states }
  }

  /** Truth helper for the smoke: the bulkhead-rejected count for a burst. */
  simulateBulkheadWave(districtId: string, count: number): number {
    const fresh = districtsFor(this.state.level)
    const { stats } = simulateWave(fresh, burst(districtId, count, "success", 0))
    return stats.perDistrict[districtId]?.bulkheadRejected ?? 0
  }

  /** Truth helper for the smoke: districts still serving after a cascade wave. */
  simulateCascadeWave(failingId: string): string[] {
    const cfg = this.state.level
    const fresh = districtsFor(cfg)
    const events: RequestEvent[] = []
    let t = 0
    for (let i = 0; i < cfg.failureThreshold + 2; i++) {
      events.push({ districtId: failingId, downstream: "failure", at: t })
      t += 5
    }
    for (let i = 0; i < 3; i++) {
      events.push({ districtId: failingId, downstream: "success", at: t })
      t += 5
    }
    for (const id of cfg.districtIds) {
      if (id === failingId) continue
      for (let i = 0; i < 3; i++) {
        events.push({ districtId: id, downstream: "success", at: t })
        t += 5
      }
    }
    const { stats } = simulateWave(fresh, events)
    return cfg.districtIds.filter((id) => {
      const s = stats.perDistrict[id]
      return s && id !== failingId && s.state === "closed" && s.served > 0
    })
  }

  // ─── internals ─────────────────────────────────────────────────────────────

  private serve(districtId: string, downstream: "success" | "failure"): void {
    const now = this.state.clock
    this.state.clock += 5
    const idx = this.state.districts.findIndex((d) => d.id === districtId)
    if (idx < 0) return
    const d = this.state.districts[idx] as District
    const out = serveRequest(d, downstream, now)
    const next = [...this.state.districts]
    next[idx] = out.district
    this.state.districts = next
    this.recordFlow(districtId, out)
  }

  private recordFlow(
    districtId: string,
    out: {
      served: boolean
      failed: boolean
      shortCircuited: boolean
      bulkheadRejected: boolean
    },
  ): void {
    const outcome: FlowRecord["outcome"] = out.shortCircuited
      ? "shortCircuited"
      : out.bulkheadRejected
        ? "bulkheadRejected"
        : out.failed
          ? "failed"
          : "served"
    const rec: FlowRecord = { id: this.flowSeq++, districtId, outcome, at: this.state.clock }
    this.state.flows = [rec, ...this.state.flows].slice(0, MAX_FLOWS)
  }

  private applyProbeToScene(id: string, probe: "success" | "failure"): void {
    // re-run the trip+cooldown+probe on the live districts so visuals match truth
    const cfg = this.state.level
    const fresh = districtsFor(cfg)
    const events: RequestEvent[] = [
      ...burst(id, cfg.failureThreshold, "failure", 0),
      { districtId: id, downstream: probe, at: cfg.cooldownMs + 500 },
    ]
    const { districts: after } = simulateWave(fresh, events)
    this.state.districts = after
    this.state.clock = cfg.cooldownMs + 500
    const out =
      probe === "success"
        ? { served: true, failed: false, shortCircuited: false, bulkheadRejected: false }
        : { served: true, failed: true, shortCircuited: false, bulkheadRejected: false }
    this.recordFlow(id, out)
  }

  private applyBurstToScene(id: string, count: number, downstream: "success" | "failure"): void {
    const fresh = districtsFor(this.state.level)
    const events = burst(id, count, downstream, 0)
    const { districts: after, stats } = simulateWave(fresh, events)
    this.state.districts = after
    const s = stats.perDistrict[id]
    for (let i = 0; i < count; i++) {
      const rejected = i >= count - (s?.bulkheadRejected ?? 0)
      this.recordFlow(id, {
        served: !rejected,
        failed: false,
        shortCircuited: false,
        bulkheadRejected: rejected,
      })
    }
  }

  private applyCascadeToScene(failingId: string): void {
    const cfg = this.state.level
    const fresh = districtsFor(cfg)
    const events: RequestEvent[] = []
    let t = 0
    for (let i = 0; i < cfg.failureThreshold + 2; i++) {
      events.push({ districtId: failingId, downstream: "failure", at: t })
      t += 5
    }
    for (let i = 0; i < 3; i++) {
      events.push({ districtId: failingId, downstream: "success", at: t })
      t += 5
    }
    for (const id of cfg.districtIds) {
      if (id === failingId) continue
      for (let i = 0; i < 3; i++) {
        events.push({ districtId: id, downstream: "success", at: t })
        t += 5
      }
    }
    const { districts: after } = simulateWave(fresh, events)
    this.state.districts = after
    this.state.clock = t
  }

  private finishWave(outcome: WaveOutcome): void {
    this.state.lastOutcome = outcome
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
    this.commit()
  }
}

/** Re-exported for tests that build districts directly. */
export { makeDistrict }
