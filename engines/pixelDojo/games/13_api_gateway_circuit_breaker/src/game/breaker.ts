// Circuit-breaker state machine — the concept this game teaches.
//
// Pure logic: no DOM, no three.js, no timers. Every visual in the scene is a
// projection of this object's state. Lives here so it can be unit-tested
// without a render context.
//
// Invariants encoded (mirrors curriculum/13_api_gateway_circuit_breaker/docs/spec.md
// FR-004 through FR-009):
//
//   FR-004  Three explicit states: CLOSED, OPEN, HALF_OPEN.
//   FR-005  In CLOSED, successes/failures are counted in a rolling window.
//   FR-006  CLOSED -> OPEN the instant the rolling failure rate crosses the
//           threshold AND minimum_requests is met. The player IS the trip
//           logic (presses C); tripping before threshold is a false-trip
//           (trips_early), tripping after the cue has been ignored is late
//           (trips_late -> reactor_overloads).
//   FR-007  OPEN -> HALF_OPEN only after open_cooldown_ms has elapsed. Probing
//           before cooldown is rejected as probes_premature.
//   FR-008  HALF_OPEN admits at most half_open_max_probes test requests. N
//           consecutive successes (half_open_successes_to_close) close the
//           circuit; ANY probe failure snaps back to OPEN and re-lights the
//           cooldown.
//   FR-009  While OPEN, requests MUST be fail-fasted to fallback without
//           contacting the upstream. A request that leaks through to the
//           reactor while OPEN is a fault (open_leaks).

export type BreakerState = "CLOSED" | "OPEN" | "HALF_OPEN"

export type BreakerConfig = {
  // Failure-rate at which the breaker trips CLOSED -> OPEN. 0.5 = 50%.
  readonly failureRateThreshold: number
  // Minimum requests in the rolling window before the threshold is consulted.
  readonly minimumRequests: number
  // How long OPEN must persist before OPEN -> HALF_OPEN is allowed (ms, scaled
  // in-wave; real spec cooldowns are seconds-to-minutes).
  readonly openCooldownMs: number
  // Max probes admitted in HALF_OPEN before the breaker must close or reopen.
  readonly halfOpenMaxProbes: number
  // Consecutive probe successes required to transition HALF_OPEN -> CLOSED.
  readonly halfOpenSuccessesToClose: number
}

export const DEFAULT_CONFIG: BreakerConfig = {
  failureRateThreshold: 0.5,
  minimumRequests: 4,
  openCooldownMs: 1500,
  halfOpenMaxProbes: 3,
  halfOpenSuccessesToClose: 3,
}

export type BreakerSnapshot = {
  readonly state: BreakerState
  readonly closedRequests: number
  readonly closedFailures: number
  readonly failureRate: number
  readonly thresholdCrossed: boolean
  readonly openedAtMs: number | null
  readonly cooldownRemainingMs: number
  readonly cooldownDone: boolean
  readonly probeSlotsUsed: number
  readonly probeSlotsRemaining: number
  readonly consecutiveProbeSuccesses: number
}

export type TripResult = {
  readonly ok: boolean
  readonly reason: "threshold_not_crossed" | "ok" | "wrong_state"
}

export type ProbeResult = {
  readonly ok: boolean
  readonly reason: "cooldown_not_done" | "ok" | "wrong_state" | "no_slots"
}

export type ProbeOutcome = {
  readonly reopened: boolean
  readonly closed: boolean
}

export class CircuitBreaker {
  readonly config: BreakerConfig
  private _state: BreakerState = "CLOSED"
  private closedRequests = 0
  private closedFailures = 0
  private openedAtMs: number | null = null
  private probeSlotsUsed = 0
  private consecutiveProbeSuccesses = 0

  constructor(config: BreakerConfig = DEFAULT_CONFIG) {
    this.config = config
  }

  get state(): BreakerState {
    return this._state
  }

  snapshot(now: number): BreakerSnapshot {
    const cooldownRemainingMs = this.cooldownRemaining(now)
    return {
      state: this._state,
      closedRequests: this.closedRequests,
      closedFailures: this.closedFailures,
      failureRate: this.failureRate(),
      thresholdCrossed: this.thresholdCrossed(),
      openedAtMs: this.openedAtMs,
      cooldownRemainingMs,
      cooldownDone: this.cooldownDone(now),
      probeSlotsUsed: this.probeSlotsUsed,
      probeSlotsRemaining: Math.max(0, this.config.halfOpenMaxProbes - this.probeSlotsUsed),
      consecutiveProbeSuccesses: this.consecutiveProbeSuccesses,
    }
  }

  // Record a CLOSED-phase request outcome (the reactor returned success/fail).
  // Updates the rolling window. Does NOT trip — the player trips.
  recordClosedOutcome(failed: boolean): void {
    if (this._state !== "CLOSED") {
      return
    }
    this.closedRequests += 1
    if (failed) {
      this.closedFailures += 1
    }
  }

  failureRate(): number {
    if (this.closedRequests === 0) {
      return 0
    }
    return this.closedFailures / this.closedRequests
  }

  thresholdCrossed(): boolean {
    return (
      this.closedRequests >= this.config.minimumRequests &&
      this.failureRate() >= this.config.failureRateThreshold
    )
  }

  // CLOSED -> OPEN. Player-initiated (the human is the trip logic). Returns
  // trips_early if threshold not yet crossed.
  trip(now: number): TripResult {
    if (this._state !== "CLOSED") {
      return { ok: false, reason: "wrong_state" }
    }
    if (!this.thresholdCrossed()) {
      return { ok: false, reason: "threshold_not_crossed" }
    }
    this._state = "OPEN"
    this.openedAtMs = now
    this.probeSlotsUsed = 0
    this.consecutiveProbeSuccesses = 0
    return { ok: true, reason: "ok" }
  }

  cooldownRemaining(now: number): number {
    if (this.openedAtMs === null) {
      return 0
    }
    const elapsed = now - this.openedAtMs
    return Math.max(0, this.config.openCooldownMs - elapsed)
  }

  cooldownDone(now: number): boolean {
    if (this.openedAtMs === null) {
      return true
    }
    return now - this.openedAtMs >= this.config.openCooldownMs
  }

  // OPEN -> HALF_OPEN. Allowed only after cooldown drained. Player-initiated.
  probe(now: number): ProbeResult {
    if (this._state !== "OPEN") {
      return { ok: false, reason: "wrong_state" }
    }
    if (!this.cooldownDone(now)) {
      return { ok: false, reason: "cooldown_not_done" }
    }
    if (this.probeSlotsUsed >= this.config.halfOpenMaxProbes) {
      return { ok: false, reason: "no_slots" }
    }
    this._state = "HALF_OPEN"
    return { ok: true, reason: "ok" }
  }

  // HALF_OPEN: consume one probe slot. The caller records the reactor outcome
  // via recordProbeOutcome. Returns false if no slots remain (over-budget).
  consumeProbeSlot(): boolean {
    if (this._state !== "HALF_OPEN") {
      return false
    }
    if (this.probeSlotsUsed >= this.config.halfOpenMaxProbes) {
      return false
    }
    this.probeSlotsUsed += 1
    return true
  }

  probeSlotsRemaining(): number {
    return Math.max(0, this.config.halfOpenMaxProbes - this.probeSlotsUsed)
  }

  // Record a probe's reactor outcome. On success, increments the consecutive
  // counter; on reaching the threshold, auto-closes. On failure, snaps back to
  // OPEN and re-lights the cooldown (FR-008 asymmetry: recovery is hard,
  // failure is instant).
  recordProbeOutcome(failed: boolean, now: number): ProbeOutcome {
    if (this._state !== "HALF_OPEN") {
      return { reopened: false, closed: false }
    }
    if (failed) {
      this._state = "OPEN"
      this.openedAtMs = now
      this.probeSlotsUsed = 0
      this.consecutiveProbeSuccesses = 0
      return { reopened: true, closed: false }
    }
    this.consecutiveProbeSuccesses += 1
    if (this.consecutiveProbeSuccesses >= this.config.halfOpenSuccessesToClose) {
      this.close()
      return { reopened: false, closed: true }
    }
    return { reopened: false, closed: false }
  }

  // HALF_OPEN -> CLOSED. Auto-called by recordProbeOutcome on N successes; the
  // player also seals it with C (CLOSE). Returns false if not in HALF_OPEN or
  // if the success threshold was not met.
  close(): boolean {
    if (this._state !== "HALF_OPEN") {
      return false
    }
    if (this.consecutiveProbeSuccesses < this.config.halfOpenSuccessesToClose) {
      return false
    }
    this._state = "CLOSED"
    this.closedRequests = 0
    this.closedFailures = 0
    this.openedAtMs = null
    this.probeSlotsUsed = 0
    this.consecutiveProbeSuccesses = 0
    return true
  }
}
