// Evidence record + emitter for the Log River Delta game.
//
// The game emits evidence ONLY. It never writes learner state, never touches
// localStorage keys learning_state / units_log / mastered, and never calls
// the learner substrate — mastery is owned by the verifier
// (engines/pixelDojo/EVIDENCE_CONTRACT.md).
//
// Emission points:
//   - console.log("EVIDENCE " + JSON.stringify(record)) — scraped by the
//     Playwright smoke run as the durable signal that the wave was resolved.
//   - window.__gameEvidence = record — single-record in-page channel.
//
// Schema (this game's variant of the producer contract — the `schema`
// literal identifies the variant for downstream readers):
//   {
//     "schema": "14_log_aggregator-v1",
//     "unit_id": "14_log_aggregator",
//     "project": "14_log_aggregator",
//     "encounter_id": "river-delta-L1",
//     "game": "Log River Delta",
//     "ts": "<iso8601>",
//     "pass": boolean,
//     "gates": GateResult[],
//     "metrics": { ...Metrics }
//   }

import type { Metrics } from "./logriver"

export type GateResult = {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

export type LogAggregatorEvidenceRecord = {
  readonly schema: "14_log_aggregator-v1"
  readonly unit_id: "14_log_aggregator"
  readonly project: "14_log_aggregator"
  readonly encounter_id: "river-delta-L1"
  readonly game: "Log River Delta"
  readonly ts: string
  readonly pass: boolean
  readonly gates: GateResult[]
  readonly metrics: Metrics
}

// Gate evaluation mirrors the plan's pass rule (§6, §11): each gate is a
// single load-bearing invariant of the pipeline. The verifier owns mastery;
// this list is the producer's read-out so the smoke can assert each.
export function evaluateGates(m: Metrics): GateResult[] {
  return [
    {
      name: "no_backpressure",
      passed: m.backpressure_rejects === 0,
      detail: `${m.backpressure_rejects} 429 ingest_backpressure reject(s)`,
    },
    {
      name: "no_duplicate_double_count",
      passed: m.duplicates_double_counted === 0,
      detail: `${m.duplicates_detected} duplicate(s) detected, ${m.duplicates_double_counted} double-counted`,
    },
    {
      name: "no_wrong_filter",
      passed: m.queries_wrong_filter === 0,
      detail: `${m.queries_wrong_filter} wrong-filter query(ies)`,
    },
    {
      name: "no_too_broad",
      passed: m.queries_too_broad === 0,
      detail: `${m.queries_too_broad} too-broad scan(s)`,
    },
    {
      name: "all_traces_reconstructed",
      passed: m.traces_requested > 0 && m.traces_reconstructed_correctly === m.traces_requested,
      detail: `${m.traces_reconstructed_correctly}/${m.traces_requested} trace(s) rebuilt`,
    },
    {
      name: "no_out_of_order_spans",
      passed: m.traces_out_of_order === 0,
      detail: `${m.traces_out_of_order} out-of-order span drop(s)`,
    },
    {
      name: "retention_held",
      passed: m.required_logs_expired_before_query === 0,
      detail: `${m.required_logs_expired_before_query} required log(s) expired before query`,
    },
    {
      name: "compression_ratio_ge_3",
      passed: m.compression_ratio >= 3.0,
      detail: `compression ratio ${m.compression_ratio.toFixed(2)}:1 on cold segments`,
    },
    {
      name: "no_starvation",
      passed: m.starvation_events === 0,
      detail: `${m.starvation_events} multi-source starvation event(s)`,
    },
  ]
}

export function buildEvidence(metrics: Metrics, now: Date): LogAggregatorEvidenceRecord {
  const gates = evaluateGates(metrics)
  const pass = gates.every((gate) => gate.passed)
  return {
    schema: "14_log_aggregator-v1",
    unit_id: "14_log_aggregator",
    project: "14_log_aggregator",
    encounter_id: "river-delta-L1",
    game: "Log River Delta",
    ts: now.toISOString(),
    pass,
    gates,
    metrics,
  }
}

export function emitEvidence(record: LogAggregatorEvidenceRecord): LogAggregatorEvidenceRecord {
  if (typeof window !== "undefined") {
    window.__gameEvidence = record
  }
  // The smoke spec matches this line on /^EVIDENCE /.
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
