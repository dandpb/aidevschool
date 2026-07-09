import { dualEmit } from "../../../../shared/evidence"
// Evidence record + emitter for the Breaker Grid game.
//
// The game emits evidence ONLY. It never writes learner state, never touches
// localStorage keys learning_state / units_log / mastered, and never calls the
// learner substrate — mastery is owned by the verifier
// (engines/pixelDojo/EVIDENCE_CONTRACT.md, plan slice §11).
//
// Emission points:
//   - console.log("EVIDENCE " + JSON.stringify(record)) — scraped by the
//     Playwright smoke run as the durable signal that the wave resolved.
//   - window.__gameEvidence = record — single-record in-page channel.
//
// Schema (this game's variant of the producer contract — schema literal
// identifies the variant for downstream readers):
//   {
//     "schema": "13_api_gateway_circuit_breaker-v1",
//     "unit_id": "13_api_gateway_circuit_breaker",
//     "pass": boolean,
//     "gates": GateResult[],
//     "encounter_id": "breaker-grid-01",
//     "game": "Breaker Grid",
//     "ts": "<iso8601>",
//     "metrics": { ...BreakerMetrics },
//     "curriculum_context": { ... },
//     "review_context": { ... }
//   }

import type { BreakerMetrics } from "./wave"

export type GateResult = {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

export type BreakerEvidenceRecord = {
  readonly schema: "13_api_gateway_circuit_breaker-v1"
  readonly unit_id: "13_api_gateway_circuit_breaker"
  readonly pass: boolean
  readonly gates: GateResult[]
  readonly encounter_id: "breaker-grid-01"
  readonly game: "Breaker Grid"
  readonly ts: string
  readonly metrics: BreakerMetrics
  readonly curriculum_context: {
    readonly concept: string
    readonly mechanic: string
    readonly accepted_signal: string
    readonly rejected_trap: string
  }
  readonly review_context: {
    readonly unit_kind: "concept"
    readonly scheduled_review: boolean
    readonly review_reason: "deepening"
    readonly streak_candidate: boolean
    readonly scheduler_source: "learner-substrate"
    readonly verifier_required: true
  }
}

// Gate evaluation — pass requires every closed pulse admitted, breaker tripped
// exactly once on the threshold cue, every open pulse fail-fasted to fallback
// with zero upstream leaks, no probe before cooldown, exactly N successful
// probes then close, no reactor overload, no overflow. (Plan slice §6, §11.)
export function evaluateGates(metrics: BreakerMetrics): GateResult[] {
  return [
    {
      name: "all_closed_admits",
      passed: metrics.closed_admits_correct === metrics.closed_admits_total,
      detail: `${metrics.closed_admits_correct}/${metrics.closed_admits_total} CLOSED pulses admitted`,
    },
    {
      name: "trip_on_threshold",
      passed:
        metrics.trips_correct >= 1 && metrics.trips_early === 0 && metrics.trips_late === 0,
      detail: `${metrics.trips_correct} on-cue trip(s), ${metrics.trips_early} early, ${metrics.trips_late} late`,
    },
    {
      name: "all_open_rejects",
      passed: metrics.open_rejects_correct === metrics.open_rejects_total,
      detail: `${metrics.open_rejects_correct}/${metrics.open_rejects_total} OPEN pulses fail-fasted`,
    },
    {
      name: "no_open_leaks",
      passed: metrics.open_leaks === 0,
      detail: `${metrics.open_leaks} upstream leak(s) while OPEN`,
    },
    {
      name: "no_premature_probes",
      passed: metrics.probes_premature === 0,
      detail: `${metrics.probes_premature} probe(s) before cooldown`,
    },
    {
      name: "all_probes_correct",
      passed: metrics.probes_correct === metrics.probes_total,
      detail: `${metrics.probes_correct}/${metrics.probes_total} probes admitted within budget`,
    },
    {
      name: "no_halfopen_leaks",
      passed: metrics.halfopen_admit_leaks === 0,
      detail: `${metrics.halfopen_admit_leaks} over-budget HALF_OPEN admit(s)`,
    },
    {
      name: "closed_on_successes",
      passed: metrics.closes_correct >= 1,
      detail: `${metrics.closes_correct} close(s) after N consecutive probe successes`,
    },
    {
      name: "no_reactor_overload",
      passed: metrics.reactor_overloads === 0,
      detail: `${metrics.reactor_overloads} reactor overload(s) from late trips`,
    },
    {
      name: "no_overflow",
      passed: !metrics.overflow,
      detail: metrics.overflow ? "input bus overflowed" : "input bus held the queue",
    },
  ]
}

export function buildEvidence(metrics: BreakerMetrics, now: Date): BreakerEvidenceRecord {
  const gates = evaluateGates(metrics)
  const pass = gates.every((gate) => gate.passed)
  return {
    schema: "13_api_gateway_circuit_breaker-v1",
    unit_id: "13_api_gateway_circuit_breaker",
    pass,
    gates,
    encounter_id: "breaker-grid-01",
    game: "Breaker Grid",
    ts: now.toISOString(),
    metrics,
    curriculum_context: {
      concept: "circuit breaker state machine (closed/open/half-open)",
      mechanic: "Breaker Grid",
      accepted_signal:
        "trip on threshold; fail-fast in open; probe after cooldown; close on N consecutive probe successes",
      rejected_trap:
        "leaking a request to the upstream while open, or probing before the cooldown elapsed",
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

export function emitEvidence(record: BreakerEvidenceRecord): BreakerEvidenceRecord {
  return dualEmit(record, "game")
}
