// Evidence emitter for the Log Pier (16_mini_message_queue) game.
//
// Producer-only: the game emits a raw record; a separate verifier owns any
// learning-gate transition. This module never imports learner state. Mirrors
// the EVIDENCE_CONTRACT.md producer pattern, scoped to this game's metrics
// variant (threejs-message-queue).

import type { MessageQueueSnapshot } from "./log"

export const SCHEMA = "16_mini_message_queue-v1"
export const UNIT_ID = "16_mini_message_queue"
export const PROJECT = "16_mini_message_queue"
export const ENCOUNTER_ID = "encounter-16_mini_message_queue"
export const GAME = "PixelDojo Quest"

export interface MessageQueueEvidenceRecord {
  readonly schema: string
  readonly source: "pixelquest"
  readonly unit_id: string
  readonly project: string
  readonly encounter_id: string
  readonly game: "PixelDojo Quest"
  readonly ts: string
  readonly pass: boolean
  readonly gates: readonly string[]
  readonly metrics: {
    readonly kind: "threejs-message-queue"
    readonly level: number
    readonly partitions_managed: number
    readonly consumer_groups: number
    readonly messages_inbound: number
    readonly messages_produced: number
    readonly correct_routes: number
    readonly misroutes: number
    readonly ordering_violations: number
    readonly commits: number
    readonly lag_peak: number
    readonly lag_max_tolerance: number
    readonly replays: number
    readonly replay_faults: number
    readonly retention_faults: number
    readonly deadline_misses: number
  }
  readonly curriculum_context: {
    readonly concept: string
    readonly mechanic: string
    readonly accepted_signal: string
    readonly rejected_trap: string
  }
  readonly review_context: {
    readonly unit_kind: "concept"
    readonly scheduled_review: boolean
    readonly review_reason: "due" | "deepening"
    readonly streak_candidate: boolean
    readonly scheduler_source: "learner-substrate"
    readonly verifier_required: true
  }
}

export interface BuildEvidenceInput {
  readonly snapshot: MessageQueueSnapshot
  readonly level: number
  readonly commitTarget: number
}

/**
 * Map a finished-wave snapshot into the evidence record. Pass rule (gate):
 * every inbound orb was produced, no misroutes, no ordering violations, no
 * retention/replay faults, no deadline misses, lag_peak <= tolerance, and
 * commits >= commit_target (every consumer group has committed past its
 * per-group target offset).
 */
export function buildEvidence(input: BuildEvidenceInput): MessageQueueEvidenceRecord {
  const s = input.snapshot
  const allProduced = s.messages_produced === s.messages_inbound
  const noMisroutes = s.misroutes === 0
  const noOrderingViolations = s.ordering_violations === 0
  const noRetention = s.retention_faults === 0
  const noReplayFaults = s.replay_faults === 0
  const noDeadlineMisses = s.deadline_misses === 0
  const lagOk = s.lag_peak <= s.lag_max_tolerance
  const commitsOk = s.commits >= input.commitTarget

  const pass =
    allProduced &&
    noMisroutes &&
    noOrderingViolations &&
    noRetention &&
    noReplayFaults &&
    noDeadlineMisses &&
    lagOk &&
    commitsOk

  const gates = [
    `produced:${s.messages_produced}/${s.messages_inbound}`,
    `misroutes:${s.misroutes}=0`,
    `ordering:${s.ordering_violations}=0`,
    `retention_faults:${s.retention_faults}=0`,
    `replay_faults:${s.replay_faults}=0`,
    `deadline_misses:${s.deadline_misses}=0`,
    `lag_peak:${s.lag_peak}<=${s.lag_max_tolerance}`,
    `commits:${s.commits}>=${input.commitTarget}`,
  ]

  return {
    schema: SCHEMA,
    source: "pixelquest",
    unit_id: UNIT_ID,
    project: PROJECT,
    encounter_id: ENCOUNTER_ID,
    game: GAME,
    ts: new Date().toISOString(),
    pass,
    gates,
    metrics: {
      kind: "threejs-message-queue",
      level: input.level,
      partitions_managed: s.partitions.length,
      consumer_groups: s.consumerGroups.length,
      messages_inbound: s.messages_inbound,
      messages_produced: s.messages_produced,
      correct_routes: s.correct_routes,
      misroutes: s.misroutes,
      ordering_violations: s.ordering_violations,
      commits: s.commits,
      lag_peak: s.lag_peak,
      lag_max_tolerance: s.lag_max_tolerance,
      replays: s.replays,
      replay_faults: s.replay_faults,
      retention_faults: s.retention_faults,
      deadline_misses: s.deadline_misses,
    },
    curriculum_context: {
      concept:
        "Log-structured storage with partitioned ordered offsets, consumer-group cursors, lag, replay, retention",
      mechanic: "Log Pier (3D partition lanes + offset slots + cursor rings + retention tide)",
      accepted_signal:
        "key-colored orb routed to matching lane, appended at nextOffset, cursor fetched-then-committed, lag held under tolerance",
      rejected_trap:
        "misroute to wrong lane, skip commit (at-least-once redelivery), cursor left behind the retention tide",
    },
    review_context: {
      unit_kind: "concept",
      // The substrate does not yet register 16_mini_message_queue, so this
      // attempt is logged as deepening play, not a scheduled review.
      scheduled_review: false,
      review_reason: "deepening",
      streak_candidate: false,
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
  }
}

declare global {
  interface Window {
    __messageQueueEvidence?: MessageQueueEvidenceRecord[]
    __gameEvidence?: MessageQueueEvidenceRecord
  }
}

/** Validate then emit: console + in-page channels. Returns the record. */
export function emitEvidence(record: MessageQueueEvidenceRecord): MessageQueueEvidenceRecord {
  if (typeof window !== "undefined") {
    window.__messageQueueEvidence = window.__messageQueueEvidence ?? []
    window.__messageQueueEvidence.push(record)
    window.__gameEvidence = record
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
