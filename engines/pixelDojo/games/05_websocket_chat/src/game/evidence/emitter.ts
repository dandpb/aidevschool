import { dualEmit } from "../../../../../shared/evidence"
// Evidence emission for 05_websocket_chat.
//
// The game emits evidence only; it never writes learner state. A separate
// verifier consumes the EVIDENCE record and decides the learning gate.
//
// Two emission channels (mirrors the pixel-quest pattern):
//   1. console.log("EVIDENCE " + JSON.stringify(rec)) — for stdout scraping.
//   2. window.__gameEvidence = rec — the in-page channel the Playwright smoke
//      driver reads to capture the final record without parsing console logs.
//
// Schema (05_websocket_chat-v1):
//   {
//     schema:         "05_websocket_chat-v1",
//     unit_id:        "05_websocket_chat",
//     pass:           boolean,
//     gates:          string[],           // list of invariant gates checked
//     metrics:        Metrics,            // see logic.ts -> Metrics
//     concept:        string,
//     mechanic:       string,
//     accepted_signal:string,
//     rejected_trap:  string,
//     ts:             ISO-8601
//   }

import type { GameState, Metrics } from "../logic"

export type EvidenceRecord = {
  readonly schema: "05_websocket_chat-v1"
  readonly unit_id: "05_websocket_chat"
  readonly pass: boolean
  readonly gates: readonly string[]
  readonly metrics: Metrics
  readonly concept: string
  readonly mechanic: string
  readonly accepted_signal: string
  readonly rejected_trap: string
  readonly ts: string
}

export const EVIDENCE_GATES = [
  "messages_broadcast === messages_inbound",
  "wrong_room_leaks === 0",
  "missed_disconnects === 0",
  "deadline_misses === 0",
  "slow_consumer_drops <= tolerance",
] as const

export function buildEvidence(state: GameState, now: Date): EvidenceRecord {
  return {
    schema: "05_websocket_chat-v1",
    unit_id: "05_websocket_chat",
    pass: state.won,
    gates: [...EVIDENCE_GATES],
    metrics: state.metrics,
    concept: "Persistent WebSocket links, room fan-out, heartbeat pruning",
    mechanic: "Switch-Fabric Hub (3D)",
    accepted_signal: "1 inbound -> N room-member deliveries, no leaks, dead peers pruned",
    rejected_trap: "wrong-room fan-out (leak) or dead peer left on the wire (waste)",
    ts: now.toISOString(),
  }
}

export function emitEvidence(record: EvidenceRecord): EvidenceRecord {
  return dualEmit(record, "game")
}
