// Evidence record + emitter for the Ring Keeper game (10_distributed_cache).
//
// The game emits evidence ONLY. It never writes learner state, never touches
// localStorage keys learning_state / units_log / mastered, and never calls the
// learner substrate — mastery is owned by the verifier (EVIDENCE_CONTRACT.md
// and the PLAN slice §11 side-effect contract).
//
// Emission points (mirrors the sibling 02_key_value_store pattern):
//   - console.log("EVIDENCE " + JSON.stringify(record)) — scraped by the
//     Playwright smoke run as the durable signal that the wave was resolved.
//   - window.__gameEvidence = record — single-record in-page channel.
//
// Schema (this game's variant of the producer contract — schema literal
// identifies the variant for downstream readers):
//   {
//     "schema": "10_distributed_cache-v1",
//     "unit_id": "10_distributed_cache",
//     "project": "10_distributed_cache",
//     "encounter_id": "ring-keeper-01",
//     "game": "Ring Keeper",
//     "ts": "<iso8601>",
//     "pass": boolean,
//     "gates": GateResult[],
//     "metrics": Metrics
//   }

import type { Metrics } from "./wave"

export type GateResult = {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

export type RingKeeperEvidenceRecord = {
  readonly schema: "10_distributed_cache-v1"
  readonly unit_id: "10_distributed_cache"
  readonly project: "10_distributed_cache"
  readonly encounter_id: "ring-keeper-01"
  readonly game: "Ring Keeper"
  readonly ts: string
  readonly pass: boolean
  readonly gates: GateResult[]
  readonly metrics: Metrics
}

// Gate evaluation mirrors the PLAN slice §6 win conditions and §11 pass rule.
// Every gate must hold for `pass === true`.
export function evaluateGates(metrics: Metrics): GateResult[] {
  return [
    {
      name: "wave_cleared",
      passed: metrics.wave_cleared,
      detail: metrics.wave_cleared ? "wave cleared" : "wave not cleared",
    },
    {
      name: "all_keys_routed",
      passed: metrics.keys_routed >= metrics.wave_target && metrics.misroutes === 0,
      detail: `${metrics.keys_routed}/${metrics.wave_target} routed, ${metrics.misroutes} misroutes`,
    },
    {
      name: "survived_churn",
      passed: metrics.churn_events_survived >= 1,
      detail: `${metrics.churn_events_survived} churn event(s) survived`,
    },
    {
      name: "minimal_remap_under_ring",
      passed:
        metrics.keys_remapped <= metrics.remap_budget && !metrics.modn_used_at_churn,
      detail: `${metrics.keys_remapped} remapped (budget ${metrics.remap_budget}); MOD-N at churn: ${metrics.modn_used_at_churn}`,
    },
    {
      name: "hot_key_balanced",
      passed: metrics.hot_key_balanced,
      detail: metrics.hot_key_balanced ? "hot key balanced by a node split" : "hot key NOT balanced",
    },
    {
      name: "no_excess_spills",
      passed: metrics.spills <= metrics.spill_budget,
      detail: `${metrics.spills} spill(s) (budget ${metrics.spill_budget})`,
    },
  ]
}

export function buildEvidence(metrics: Metrics, now: Date): RingKeeperEvidenceRecord {
  const gates = evaluateGates(metrics)
  const pass = gates.every((gate) => gate.passed)
  return {
    schema: "10_distributed_cache-v1",
    unit_id: "10_distributed_cache",
    project: "10_distributed_cache",
    encounter_id: "ring-keeper-01",
    game: "Ring Keeper",
    ts: now.toISOString(),
    pass,
    gates,
    metrics,
  }
}

export function emitEvidence(record: RingKeeperEvidenceRecord): RingKeeperEvidenceRecord {
  if (typeof window !== "undefined") {
    window.__gameEvidence = record
  }
  // The smoke spec matches this line on /^EVIDENCE /.
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
