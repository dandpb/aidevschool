// Evidence emission for 07_rest_api_auth (Aegis Corridor).
//
// The game emits evidence only; it never writes learner state. A separate
// verifier consumes the EVIDENCE record and decides the learning gate.
//
// Two emission channels (mirrors the pixel-quest pattern):
//   1. console.log("EVIDENCE " + JSON.stringify(rec)) — for stdout scraping.
//   2. window.__gameEvidence = rec AND window.__aegisEvidence = rec — the
//      in-page channels the Playwright smoke reads to capture the final
//      record without parsing console logs.
//
// Schema (07_rest_api_auth-v1):
//   {
//     schema:          "07_rest_api_auth-v1",
//     source:          "aegis-corridor",
//     unit_id:         "07_rest_api_auth",
//     project:         "07_rest_api_auth",
//     encounter_id:    "encounter-aegis-corridor-01",
//     game:            "Aegis Corridor",
//     ts:              ISO-8601,
//     pass:            boolean,
//     gates:           string[],          // gate invariants asserted
//     metrics:         Metrics,           // see logic.ts -> Metrics
//     concept:         string,
//     mechanic:        string,
//     accepted_signal: string,
//     rejected_trap:   string
//   }

import type { GameState, Metrics } from "../logic"

export type EvidenceRecord = {
  readonly schema: "07_rest_api_auth-v1"
  readonly source: "aegis-corridor"
  readonly unit_id: "07_rest_api_auth"
  readonly project: "07_rest_api_auth"
  readonly encounter_id: "encounter-aegis-corridor-01"
  readonly game: "Aegis Corridor"
  readonly ts: string
  readonly pass: boolean
  readonly gates: readonly string[]
  readonly metrics: Metrics
  readonly concept: string
  readonly mechanic: string
  readonly accepted_signal: string
  readonly rejected_trap: string
}

// Gate invariants asserted for a passing wave. Each one is a single sentence
// the verifier can recite back; together they encode the chain-ordering
// contract from PLAN §6 + §11.
export const EVIDENCE_GATES = [
  "gate_order == [version, validation, authn, authz]",
  "forged_admitted == 0",
  "expired_admitted == 0",
  "wrong_audience_admitted == 0",
  "missing_token_admitted == 0",
  "forbidden_reached_handler == 0",
  "malformed_admitted == 0",
  "wrong_version_admitted == 0",
  "legit_rejected <= 1",
  "heat_peak < MAX_HEAT",
] as const

export function buildEvidence(state: GameState, now: Date): EvidenceRecord {
  return {
    schema: "07_rest_api_auth-v1",
    source: "aegis-corridor",
    unit_id: "07_rest_api_auth",
    project: "07_rest_api_auth",
    encounter_id: "encounter-aegis-corridor-01",
    game: "Aegis Corridor",
    ts: now.toISOString(),
    pass: state.pass,
    gates: [...EVIDENCE_GATES],
    metrics: state.metrics,
    concept: "Compose authentication and authorization middleware around a layered REST API",
    mechanic: "Aegis Corridor — ordered gate-ring composition",
    accepted_signal: "canonical order Version->Validation->AuthN->AuthZ with zero breaches",
    rejected_trap: "AuthZ before AuthN lets forged role claims through",
  }
}

export function emitEvidence(record: EvidenceRecord): EvidenceRecord {
  if (typeof window !== "undefined") {
    window.__gameEvidence = record
    window.__aegisEvidence = record
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
