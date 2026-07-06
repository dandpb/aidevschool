// Evidence record + emitter for the Traffic Forge game (project 11_load_balancer).
//
// The game emits evidence ONLY. It never writes learner state, never touches
// localStorage keys learning_state / units_log / mastered, and never calls the
// learner substrate — mastery is owned by the verifier (EVIDENCE_CONTRACT.md).
//
// Emission points:
//   - console.log("EVIDENCE " + JSON.stringify(record)) — scraped by the
//     Playwright smoke run as the durable signal that the wave resolved.
//   - window.__gameEvidence = record — single-record in-page channel.
//
// Schema (PLAN slice §11 — kind: "threejs-traffic-forge"):
//   {
//     "schema": "11_load_balancer-v1",
//     "unit_id": "11_load_balancer",
//     "project": "11_load_balancer",
//     "encounter_id": "traffic-forge-01",
//     "game": "Traffic Forge",
//     "ts": "<iso8601>",
//     "pass": boolean,
//     "gates": GateResult[],
//     "metrics": { ...Metrics },
//     "curriculum_context": { ... },
//     "review_context": { ... }
//   }

import type { Metrics } from "./wave"

export type GateResult = {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

export type LoadBalancerEvidenceRecord = {
  readonly schema: "11_load_balancer-v1"
  readonly unit_id: "11_load_balancer"
  readonly project: "11_load_balancer"
  readonly encounter_id: "traffic-forge-01"
  readonly game: "Traffic Forge"
  readonly ts: string
  readonly pass: boolean
  readonly gates: GateResult[]
  readonly metrics: Metrics
  readonly curriculum_context: {
    readonly concept: string
    readonly mechanic: string
    readonly accepted_signal: string
    readonly rejected_trap: string
  }
  readonly review_context: {
    readonly unit_kind: "concept"
    readonly scheduled_review: false
    readonly review_reason: "deepening"
    readonly streak_candidate: false
    readonly scheduler_source: "learner-substrate"
    readonly verifier_required: true
  }
}

export function evaluateGates(metrics: Metrics): GateResult[] {
  return [
    {
      name: "all_orbs_landed",
      passed: metrics.orbs_landed === metrics.orbs_total,
      detail: `${metrics.orbs_landed}/${metrics.orbs_total} orbs reached a healthy backend`,
    },
    {
      name: "no_dead_routes",
      passed: metrics.dead_routes === 0,
      detail: `${metrics.dead_routes} dead-route(s)`,
    },
    {
      name: "no_sticky_breaks",
      passed: metrics.sticky_breaks === 0,
      detail: `${metrics.sticky_breaks} sticky-break(s)`,
    },
    {
      name: "no_heavy_overflows",
      passed: metrics.heavy_overflows === 0,
      detail: `${metrics.heavy_overflows} heavy-overflow(s)`,
    },
    {
      name: "no_orbs_lost",
      passed: metrics.orbs_lost === 0,
      detail: `${metrics.orbs_lost} orb(s) lost to unrecovered retry`,
    },
    {
      name: "failover_recovered_at_least_once",
      passed: metrics.failover_recovered >= 1,
      detail: `${metrics.failover_recovered} failover(s) recovered (RF-013)`,
    },
    {
      name: "all_three_algorithms_used",
      passed:
        metrics.algorithms_used.includes("round_robin") &&
        metrics.algorithms_used.includes("least_connections") &&
        metrics.algorithms_used.includes("consistent_hash"),
      detail: `used: ${metrics.algorithms_used.join(", ") || "(none)"}`,
    },
  ]
}

export function buildEvidence(metrics: Metrics, now: Date): LoadBalancerEvidenceRecord {
  const gates = evaluateGates(metrics)
  const pass = gates.every((gate) => gate.passed)
  // Snapshot the metrics so the record is immutable post-emit.
  const snapshot: Metrics = {
    ...metrics,
    algorithms_used: [...metrics.algorithms_used],
  }
  return {
    schema: "11_load_balancer-v1",
    unit_id: "11_load_balancer",
    project: "11_load_balancer",
    encounter_id: "traffic-forge-01",
    game: "Traffic Forge",
    ts: now.toISOString(),
    pass,
    gates,
    metrics: snapshot,
    curriculum_context: {
      concept: "reverse-proxy load balancing with health-aware request routing",
      mechanic: "Traffic Forge (3D dispatcher turret + ring of health-tagged backend pillars)",
      accepted_signal:
        "every request routed to a healthy backend via the right algorithm; failover recovered on mid-flight failure",
      rejected_trap:
        "routing to a dead pillar, breaking sticky-session affinity, or losing an orb to an unrecovered retry",
    },
    review_context: {
      unit_kind: "concept",
      scheduled_review: false,
      review_reason: "deepening",
      streak_candidate: false,
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
  }
}

export function emitEvidence(record: LoadBalancerEvidenceRecord): LoadBalancerEvidenceRecord {
  if (typeof window !== "undefined") {
    window.__gameEvidence = record
  }
  // The smoke spec matches this line on /^EVIDENCE /.
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
