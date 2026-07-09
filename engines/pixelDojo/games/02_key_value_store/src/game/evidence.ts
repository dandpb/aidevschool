import { dualEmit } from "../../../../shared/evidence"
// Evidence record + emitter for the KV Warehouse game.
//
// The game emits evidence ONLY. It never writes learner state, never touches
// localStorage keys learning_state / units_log / mastered, and never calls the
// learner substrate — mastery is owned by the verifier (EVIDENCE_CONTRACT.md).
//
// Emission points:
//   - console.log("EVIDENCE " + JSON.stringify(record)) — scraped by the
//     Playwright smoke run as the durable signal that the wave was resolved.
//   - window.__gameEvidence = record — single-record in-page channel.
//
// Schema (this game's variant of the producer contract — schema literal
// identifies the variant for downstream readers):
//   {
//     "schema": "02_key_value_store-v1",
//     "unit_id": "02_key_value_store",
//     "pass": boolean,
//     "gates": GateResult[],
//     "encounter_id": "kv-warehouse-01",
//     "game": "KV Warehouse",
//     "ts": "<iso8601>",
//     "metrics": { ...KvMetrics }
//   }

import type { KvMetrics } from "./wave"

export type GateResult = {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

export type KvEvidenceRecord = {
  readonly schema: "02_key_value_store-v1"
  readonly unit_id: "02_key_value_store"
  readonly pass: boolean
  readonly gates: GateResult[]
  readonly encounter_id: "kv-warehouse-01"
  readonly game: "KV Warehouse"
  readonly ts: string
  readonly metrics: KvMetrics
}

// Gate evaluation: pass requires every SET routed to its true hash bucket,
// every GET returned a live value OR a correct MISS, no stale read of a dark
// crate, no overflow, and every DEL/EXPIRE applied at the right shelf.
export function evaluateGates(metrics: KvMetrics): GateResult[] {
  return [
    {
      name: "all_sets_correct",
      passed: metrics.puts_correct === metrics.puts_total,
      detail: `${metrics.puts_correct}/${metrics.puts_total} SETs routed to hash(key)%N`,
    },
    {
      name: "all_reads_correct",
      passed:
        metrics.gets_correct === metrics.gets_total &&
        metrics.misses_correct === metrics.misses_total,
      detail: `${metrics.gets_correct}/${metrics.gets_total} live GETs, ${metrics.misses_correct}/${metrics.misses_total} correct MISSes`,
    },
    {
      name: "no_wrong_routes",
      passed: metrics.wrong_bucket_routes === 0,
      detail: `${metrics.wrong_bucket_routes} wrong-shelf action(s)`,
    },
    {
      name: "no_stale_reads",
      passed: metrics.stale_reads === 0,
      detail: `${metrics.stale_reads} stale read(s) of an expired crate`,
    },
    {
      name: "all_dels_correct",
      passed: metrics.dels_correct === metrics.dels_total,
      detail: `${metrics.dels_correct}/${metrics.dels_total} DELs landed on a live crate`,
    },
    {
      name: "all_expires_correct",
      passed: metrics.expire_correct === metrics.expire_total,
      detail: `${metrics.expire_correct}/${metrics.expire_total} EXPIREs applied to a live crate`,
    },
    {
      name: "no_overflow",
      passed: !metrics.overflow,
      detail: metrics.overflow ? "conveyor overflowed" : "conveyor held the queue",
    },
  ]
}

export function buildEvidence(metrics: KvMetrics, now: Date): KvEvidenceRecord {
  const gates = evaluateGates(metrics)
  const pass = gates.every((gate) => gate.passed)
  return {
    schema: "02_key_value_store-v1",
    unit_id: "02_key_value_store",
    pass,
    gates,
    encounter_id: "kv-warehouse-01",
    game: "KV Warehouse",
    ts: now.toISOString(),
    metrics,
  }
}

export function emitEvidence(record: KvEvidenceRecord): KvEvidenceRecord {
  return dualEmit(record, "game")
}
