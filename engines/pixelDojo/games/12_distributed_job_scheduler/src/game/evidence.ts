import { dualEmit } from "../../../../shared/evidence"
// Evidence record + emitter for the Raft Ring game.
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
// Schema (this game's variant — schema literal identifies the variant for
// downstream readers; mirrors the producer contract pattern in pixel-quest):
//   {
//     "schema": "12_distributed_job_scheduler-v1",
//     "unit_id": "12_distributed_job_scheduler",
//     "pass": boolean,
//     "gates": GateResult[],
//     "encounter_id": "raft-ring-01",
//     "game": "Raft Ring",
//     "ts": "<iso8601>",
//     "metrics": { ...Metrics },
//     "curriculum_context": { ... },
//     "review_context": { ... }
//   }

import type { Metrics } from "./cluster"

export type GateResult = {
  readonly name: string
  readonly passed: boolean
  readonly detail: string
}

export type RaftRingEvidenceRecord = {
  readonly schema: "12_distributed_job_scheduler-v1"
  readonly unit_id: "12_distributed_job_scheduler"
  readonly project: "12_distributed_job_scheduler"
  readonly pass: boolean
  readonly gates: GateResult[]
  readonly encounter_id: "raft-ring-01"
  readonly game: "Raft Ring"
  readonly ts: string
  readonly metrics: Metrics
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

// Gate evaluation — pass requires every job to have been dispatched by the
// canonical (quorum-backed) leader, no stale token ever accepted at a worker,
// no job double-dispatched, no prolonged leaderless stall, and no attempt to
// dispatch from a non-leader. Plan slice §6.
export function evaluateGates(metrics: Metrics): GateResult[] {
  return [
    {
      name: "all_jobs_dispatched",
      passed: metrics.successful_dispatches === metrics.jobs_queued,
      detail: `${metrics.successful_dispatches}/${metrics.jobs_queued} jobs dispatched by the canonical leader`,
    },
    {
      name: "no_stale_token_accepted",
      passed: metrics.stale_token_accepted === 0,
      detail: `${metrics.stale_token_accepted} worker accepted a stale fencing token (must be 0)`,
    },
    {
      name: "no_duplicate_dispatches",
      passed: metrics.duplicate_dispatches === 0,
      detail: `${metrics.duplicate_dispatches} duplicate dispatch(es)`,
    },
    {
      name: "queue_stall_under_limit",
      passed: metrics.queue_stall_secs <= 5,
      detail: `${metrics.queue_stall_secs}s spent leaderless (limit 5s)`,
    },
    {
      name: "no_non_leader_dispatch_attempts",
      passed: metrics.non_leader_dispatch_attempts === 0,
      detail: `${metrics.non_leader_dispatch_attempts} non-leader dispatch attempt(s)`,
    },
  ]
}

export function buildEvidence(metrics: Metrics, now: Date): RaftRingEvidenceRecord {
  const gates = evaluateGates(metrics)
  const pass = gates.every((gate) => gate.passed)
  return {
    schema: "12_distributed_job_scheduler-v1",
    unit_id: "12_distributed_job_scheduler",
    project: "12_distributed_job_scheduler",
    pass,
    gates,
    encounter_id: "raft-ring-01",
    game: "Raft Ring",
    ts: now.toISOString(),
    metrics,
    curriculum_context: {
      concept: "simplified-Raft leader election with quorum + fencing-token dispatch under split-brain",
      mechanic: "Raft Ring",
      accepted_signal:
        "leader with majority quorum + latest term dispatches; workers reject stale tokens",
      rejected_trap:
        "minority-side self-promoted leader dispatches past a partition; worker accepts stale token",
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

export function emitEvidence(record: RaftRingEvidenceRecord): RaftRingEvidenceRecord {
  return dualEmit(record, "game")
}
