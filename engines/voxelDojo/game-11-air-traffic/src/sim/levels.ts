import type { Policy } from "./balancer"
import { mulberry32, type RequestSpec, requestStream } from "./rng"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  seed: number
  requestCount: number
  /** connection-lifetime skew; >0 makes least-connections visibly different from round-robin. */
  skew: number
  startBackends: number
  /** policy in force when the wave starts (player may switch where enabled). */
  defaultPolicy: Policy
  /** id of a pad that starts unhealthy (hidden until probed), or null. */
  unhealthyPad: string | null
  /** can the player fire health probes this level? */
  probesEnabled: boolean
  /** can the player switch routing policy mid-wave? */
  policySwitchEnabled: boolean
  /** L3: initial connection counts so least-connections has something to minimize over. */
  initialConnections?: ReadonlyArray<number>
  passRule: string
}

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "Round robin",
    lesson: "Round-robin sends each request to the next healthy pad in turn: 0,1,2,0,1,2,...",
    seed: 11,
    requestCount: 9,
    skew: 0,
    startBackends: 3,
    defaultPolicy: "round_robin",
    unhealthyPad: null,
    probesEnabled: false,
    policySwitchEnabled: false,
    passRule: "Predict the pad round-robin picks for ≥80% of incoming ships.",
  },
  {
    id: "L2",
    title: "Health check",
    lesson:
      "A pad can go unhealthy. Fire a probe to discover which, then predict only healthy pads — routing to a dead pad is an error.",
    seed: 22,
    requestCount: 9,
    skew: 0,
    startBackends: 3,
    defaultPolicy: "round_robin",
    unhealthyPad: "b-1",
    probesEnabled: true,
    policySwitchEnabled: false,
    passRule: "Probe to reveal health, predict ≥80% right, and make zero errors.",
  },
  {
    id: "L3",
    title: "Least connections",
    lesson:
      "Round-robin ignores that one pad is idle. Switch to least-connections so ships pile onto the pad with the fewest open connections.",
    seed: 33,
    requestCount: 8,
    skew: 0,
    startBackends: 3,
    defaultPolicy: "round_robin",
    unhealthyPad: null,
    probesEnabled: false,
    policySwitchEnabled: true,
    initialConnections: [4, 0, 3],
    passRule: "Switch to least-connections, then predict the min-connection pad for ≥80% of ships.",
  },
  {
    id: "L4",
    title: "Recovery",
    lesson:
      "An unhealthy pad can recover. Probe to revive it — once green, it re-enters rotation and round-robin sends ships to it again.",
    seed: 44,
    requestCount: 9,
    skew: 0,
    startBackends: 3,
    defaultPolicy: "round_robin",
    unhealthyPad: "b-2",
    probesEnabled: true,
    policySwitchEnabled: false,
    passRule: "Probe to recover the dead pad, then predict round-robin including it — zero errors.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export function requestsFor(cfg: LevelConfig): RequestSpec[] {
  return requestStream(mulberry32(cfg.seed), cfg.requestCount, cfg.skew)
}

export interface WaveOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

/** L1 — pure round-robin prediction accuracy (no unhealthy pads, so errors must be 0). */
export function evaluateRoundRobin(correct: number, total: number, errors: number): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8 && errors === 0,
    metrics: {
      predictions: total,
      prediction_accuracy: round2(accuracy),
      errors,
      policy: "round_robin",
    },
  }
}

/**
 * L2 — must have probed (discovered health), predicted ≥80% right, and made zero errors (no route
 * to the dead pad). Probing is the lesson: without it the player is guessing blind.
 */
export function evaluateHealthCheck(
  correct: number,
  total: number,
  errors: number,
  probeFired: boolean,
): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8 && errors === 0 && probeFired,
    metrics: {
      predictions: total,
      prediction_accuracy: round2(accuracy),
      errors,
      probe_fired: probeFired,
      policy: "round_robin",
    },
  }
}

/**
 * L3 — the player must have switched to least-connections AND predicted the min-conn pad ≥80% right.
 * Staying on round-robin fails even with perfect round-robin predictions: that policy mis-routes
 * under skewed connections.
 */
export function evaluatePolicySwitch(correct: number, total: number, policy: Policy): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: policy === "least_connections" && accuracy >= 0.8,
    metrics: {
      predictions: total,
      prediction_accuracy: round2(accuracy),
      policy,
      correct_policy: policy === "least_connections",
    },
  }
}

/**
 * L4 — the player must have probed to recover the dead pad AND it must have re-entered rotation
 * (received at least one route after recovery) AND ≥80% prediction accuracy with zero errors.
 */
export function evaluateRecovery(
  correct: number,
  total: number,
  errors: number,
  probeFired: boolean,
  recoveredReentered: boolean,
): WaveOutcome {
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: accuracy >= 0.8 && errors === 0 && probeFired && recoveredReentered,
    metrics: {
      predictions: total,
      prediction_accuracy: round2(accuracy),
      errors,
      probe_fired: probeFired,
      recovered_pad_reentered: recoveredReentered,
      policy: "round_robin",
    },
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
