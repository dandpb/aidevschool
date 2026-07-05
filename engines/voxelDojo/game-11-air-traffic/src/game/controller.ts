import { emitEvidence } from "../evidence/emit"
import {
  type Backend,
  healthyBackends,
  loadSkew,
  makeBackend,
  makeRouter,
  type Policy,
  policyRoute,
  probe,
  type RouterState,
} from "../sim/balancer"
import {
  evaluateHealthCheck,
  evaluatePolicySwitch,
  evaluateRecovery,
  evaluateRoundRobin,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  requestsFor,
} from "../sim/levels"
import { mulberry32, type RequestSpec } from "../sim/rng"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

/** A player's prediction for one request: which pad did they think the policy would pick. */
export interface Prediction {
  requestId: string
  predictedPadId: string
  actualPadId: string
  correct: boolean
  /** did the player route to an unhealthy pad? (an error) */
  error: boolean
}

export interface GameState {
  level: LevelConfig
  phase: Phase
  policy: Policy
  backends: Backend[]
  router: RouterState
  requests: RequestSpec[]
  pendingIndex: number
  predictions: Prediction[]
  /** has the player fired a health probe this wave? */
  probeFired: boolean
  /** L4: did the recovered pad receive at least one route after recovery? */
  recoveredReentered: boolean
  /** pads whose health the player has discovered via probing (revealed set). */
  revealed: Set<string>
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

export class GameController {
  private state: GameState
  private listeners: Listener[] = []
  private rng: () => number

  constructor(level: LevelId = "L1") {
    this.rng = mulberry32(levelConfig(level).seed ^ 0x9e3779b9)
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const backends = Array.from({ length: cfg.startBackends }, (_, i) => makeBackend(`b-${i}`))
    // L2/L4: one pad starts unhealthy but its dead state is HIDDEN until probed (the lesson).
    // Internally its health is "unhealthy" so policy avoids it; the scene hides the red glow until
    // the player probes (revealed set).
    if (cfg.unhealthyPad) {
      const dead = backends.find((b) => b.id === cfg.unhealthyPad)
      if (dead) dead.health = "unhealthy"
    }
    // L3: seed initial connection counts so least-connections has something to minimize.
    if (cfg.initialConnections) {
      cfg.initialConnections.forEach((c, i) => {
        const be = backends[i]
        if (be) be.connections = c
      })
    }
    return {
      level: cfg,
      phase: "briefing",
      policy: cfg.defaultPolicy,
      backends,
      router: makeRouter(),
      requests: requestsFor(cfg),
      pendingIndex: 0,
      predictions: [],
      probeFired: false,
      recoveredReentered: false,
      revealed: new Set(cfg.id === "L1" || cfg.id === "L3" ? backends.map((b) => b.id) : []),
      lastMetrics: null,
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

  start(): void {
    this.state.phase = "predicting"
    this.commit()
  }

  loadLevel(level: LevelId): void {
    this.rng = mulberry32(levelConfig(level).seed ^ 0x9e3779b9)
    this.state = this.freshState(levelConfig(level))
    this.commit()
  }

  nextLevel(): void {
    const idx = LEVELS.findIndex((l) => l.id === this.state.level.id)
    const next = LEVELS[idx + 1]
    if (next) this.loadLevel(next.id)
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  /** Switch routing policy (L3). */
  setPolicy(p: Policy): void {
    if (!this.state.level.policySwitchEnabled) return
    if (this.state.phase !== "predicting") return
    this.state.policy = p
    // reset round-robin cursor so predictions stay consistent under the new policy
    this.state.router.rrCursor = 0
    this.commit()
  }

  /**
   * Fire a health probe across every pad. Discovers hidden unhealthy pads (L2) and can recover
   * them (L4). Deterministic: uses the level-seeded rng with recover/fail probabilities fixed so
   * the L4 recovery always succeeds on probe and L2's dead pad is revealed but stays dead.
   */
  fireProbe(): void {
    if (!this.state.level.probesEnabled || this.state.phase !== "predicting") return
    this.state.probeFired = true
    for (const b of this.state.backends) {
      this.state.revealed.add(b.id)
      if (this.state.level.id === "L4") {
        // recovery: an unhealthy probe recovers with prob 1 on L4 so the lesson is deterministic.
        probe(b, this.rng, 0, 1)
      } else {
        // L2: probe reveals health but the dead pad stays dead (fail=0, recover=0 → status quo).
        probe(b, this.rng, 0, 0)
      }
    }
    this.commit()
  }

  /**
   * The player predicts which pad the current policy will pick for the pending ship, AND commits
   * that prediction as the route (an override). Routing to an unhealthy pad is recorded as an error.
   */
  predictPad(padId: string): void {
    if (this.state.phase !== "predicting") return
    const req = this.state.requests[this.state.pendingIndex]
    if (!req) return

    // Ground truth: where would the policy actually send this request right now (health-aware)?
    const truthBackend = policyRoute(this.state.policy, req, this.state.backends, this.state.router)
    const actualPadId = truthBackend?.id ?? "dropped"

    const target = this.state.backends.find((b) => b.id === padId)
    const isError = !!target && target.health === "unhealthy"
    if (target) {
      target.connections += req.cost
      target.routed += 1
      if (isError) target.errors += 1
    }

    const pred: Prediction = {
      requestId: req.id,
      predictedPadId: padId,
      actualPadId,
      correct: padId === actualPadId,
      error: isError,
    }
    this.state.predictions.push(pred)
    this.state.pendingIndex++

    // L4 bookkeeping: did a recovered pad receive a route?
    if (
      this.state.level.id === "L4" &&
      this.state.recoveredReentered === false &&
      target?.id === this.state.level.unhealthyPad &&
      target.health === "healthy"
    ) {
      this.state.recoveredReentered = true
    }

    if (this.state.pendingIndex >= this.state.requests.length) {
      this.resolveWave()
    }
    this.commit()
  }

  /** Where would the current policy send the pending request? (Ground truth for HUD hints / smoke.) */
  predictTruthPad(): string {
    const req = this.state.requests[this.state.pendingIndex]
    if (!req) return "dropped"
    // Use a scratch router copy so querying the truth doesn't advance the real cursor.
    const scratchState: RouterState = { rrCursor: this.state.router.rrCursor }
    const live = healthyBackends(this.state.backends)
    if (live.length === 0) return "dropped"
    // round-robin and least_connections are deterministic without rng.
    if (this.state.policy === "round_robin") {
      const pick = live[scratchState.rrCursor % live.length]
      return pick ? pick.id : "dropped"
    }
    if (this.state.policy === "least_connections") {
      const first = live[0]
      if (!first) return "dropped"
      let best = first
      for (const b of live) if (b.connections < best.connections) best = b
      return best.id
    }
    // random — non-deterministic to predict; we surface the deterministic stableHash pick instead
    return this.stableRandomPad(req.id)
  }

  private stableRandomPad(requestId: string): string {
    const live = healthyBackends(this.state.backends)
    if (live.length === 0) return "dropped"
    let h = 0x811c9dc5
    for (let i = 0; i < requestId.length; i++) {
      h ^= requestId.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    const pick = live[(h >>> 0) % live.length]
    return pick ? pick.id : "dropped"
  }

  currentSkew(): number {
    return loadSkew(new Map(this.state.backends.map((b) => [b.id, b.routed])))
  }

  errors(): number {
    return this.state.backends.reduce((sum, b) => sum + b.errors, 0)
  }

  predictionAccuracy(): number {
    const n = this.state.predictions.length
    if (n === 0) return 0
    return this.state.predictions.filter((p) => p.correct).length / n
  }

  /** Is a pad's health visible to the player (revealed by probe, or all-healthy level)? */
  isRevealed(padId: string): boolean {
    return this.state.revealed.has(padId)
  }

  private resolveWave(): void {
    const cfg = this.state.level
    const correct = this.state.predictions.filter((p) => p.correct).length
    const total = this.state.predictions.length
    const errors = this.errors()
    let outcome: { pass: boolean; metrics: Record<string, number | boolean | string> }
    if (cfg.id === "L1") {
      outcome = evaluateRoundRobin(correct, total, errors)
    } else if (cfg.id === "L2") {
      outcome = evaluateHealthCheck(correct, total, errors, this.state.probeFired)
    } else if (cfg.id === "L3") {
      outcome = evaluatePolicySwitch(correct, total, this.state.policy)
    } else {
      outcome = evaluateRecovery(
        correct,
        total,
        errors,
        this.state.probeFired,
        this.state.recoveredReentered,
      )
    }
    // augment with load skew for the evidence record
    outcome.metrics = { ...outcome.metrics, load_skew: round2(this.currentSkew()) }
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(cfg.id, outcome.pass, outcome.metrics)
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
