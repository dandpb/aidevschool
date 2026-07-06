// Wave definition + metrics accumulator for the Traffic Forge.
//
// The wave is a fixed, deterministic sequence of orbs the player must route.
// One orb (defaultWave.failoverOrbIndex) is paired with a scheduled mid-flight
// pillar death — the player must press R to fail over to the next eligible
// backend, exercising RF-013 (retry on backend failure). The seed is pinned
// (no RNG); the smoke run is fully deterministic.

import type { Algorithm, Orb } from "./dispatcher"

export type Metrics = {
  orbs_total: number
  orbs_landed: number
  dead_routes: number
  sticky_breaks: number
  heavy_overflows: number
  failover_recovered: number
  orbs_lost: number
  algorithms_used: Algorithm[]
  rr_skew_max: number
  wave_cleared: boolean
  wave_target: number
}

export type Wave = {
  readonly orbs: readonly Orb[]
  // 0-indexed position in `orbs` of the orb whose target pillar dies mid-flight.
  readonly failoverOrbIndex: number
}

export function emptyMetrics(orbsTotal: number): Metrics {
  return {
    orbs_total: orbsTotal,
    orbs_landed: 0,
    dead_routes: 0,
    sticky_breaks: 0,
    heavy_overflows: 0,
    failover_recovered: 0,
    orbs_lost: 0,
    algorithms_used: [],
    rr_skew_max: 0,
    wave_cleared: false,
    wave_target: orbsTotal,
  }
}

// 10-orb wave that forces the player to switch algorithms:
//   1-3 plain  → round_robin
//   4-5 heavy  → least_connections
//   6-7 sticky → consistent_hash
//   8   plain  → round_robin (mid-flight failure → R to retry)
//   9   heavy  → least_connections
//   10  sticky → consistent_hash
//
// Pillar 2 starts unhealthy (red). The failover orb's pillar (#4 under RR,
// deterministic from rrPointer state — see dispatcher.test.ts) flips to dead
// mid-flight, so failover_recovered >= 1 is reachable every run.
export function defaultWave(): Wave {
  return {
    orbs: [
      { id: 1, shape: "plain", session: null },
      { id: 2, shape: "plain", session: null },
      { id: 3, shape: "plain", session: null },
      { id: 4, shape: "heavy", session: null },
      { id: 5, shape: "heavy", session: null },
      { id: 6, shape: "sticky", session: "S:a3f" },
      { id: 7, shape: "sticky", session: "S:b7c" },
      { id: 8, shape: "plain", session: null },
      { id: 9, shape: "heavy", session: null },
      { id: 10, shape: "sticky", session: "S:c1d" },
    ],
    failoverOrbIndex: 7,
  }
}

// PASS rule (PLAN slice §6 + §11 gate): every request reached a healthy
// backend via the right algorithm, no dead-routes / sticky-breaks /
// heavy-overflows / losses, AND the player demonstrated the RF-013 retry loop
// at least once. The failover_recovered >= 1 clause is load-bearing — a wave
// that never experiences a mid-flight failure does NOT pass.
export function evaluatePass(metrics: Metrics): boolean {
  return (
    metrics.orbs_landed === metrics.orbs_total &&
    metrics.dead_routes === 0 &&
    metrics.sticky_breaks === 0 &&
    metrics.heavy_overflows === 0 &&
    metrics.orbs_lost === 0 &&
    metrics.failover_recovered >= 1
  )
}

export function recordAlgorithm(metrics: Metrics, algorithm: Algorithm): void {
  if (!metrics.algorithms_used.includes(algorithm)) {
    metrics.algorithms_used.push(algorithm)
  }
}

export function recordLanding(metrics: Metrics): void {
  metrics.orbs_landed += 1
}

export function recordFailoverRecovery(metrics: Metrics): void {
  metrics.failover_recovered += 1
}

export function recordDeadRoute(metrics: Metrics): void {
  metrics.dead_routes += 1
}

export function recordStickyBreak(metrics: Metrics): void {
  metrics.sticky_breaks += 1
}

export function recordHeavyOverflow(metrics: Metrics): void {
  metrics.heavy_overflows += 1
}

export function recordOrbLost(metrics: Metrics): void {
  metrics.orbs_lost += 1
}
