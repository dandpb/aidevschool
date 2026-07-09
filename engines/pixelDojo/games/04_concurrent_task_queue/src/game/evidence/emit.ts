import { dualEmit } from "../../../../../shared/evidence"
// Evidence emitter — TASK FORGE. The game emits evidence only; it never
// writes learner state. The verifier owns the gate.
//
// Emission contract:
//   - console.log("EVIDENCE " + JSON.stringify(record))   (stdout scrape)
//   - window.__gameEvidence = record                       (in-page channel)
//
// Schema (`04_concurrent_task_queue-v1`):
//   {
//     schema:  "04_concurrent_task_queue-v1",
//     unit_id: "04_concurrent_task_queue",
//     pass:    boolean,
//     gates:   string[],   // which gates passed
//     metrics: {
//       kind: "task-forge-task-queue",
//       ...concept-specific counters
//     },
//     scenario_id, game, ts, curriculum_context, review_context
//   }

export type GateName =
  | "priority-fifo-dispatch"
  | "retry-backoff"
  | "poison-dlq"
  | "backpressure"
  | "idempotency"
  | "concurrency-invariant"

export interface TaskForgeMetrics {
  readonly kind: "task-forge-task-queue"
  readonly dispatch_predictions: number
  readonly dispatch_correct: number
  readonly retry_classifications: number
  readonly retry_correct: number
  readonly dlq_classifications: number
  readonly dlq_correct: number
  readonly poison_requeued: number
  readonly backpressure_violations: number
  readonly idempotency_duplicates_enqueued: number
  readonly queue_overflowed: boolean
  readonly max_concurrent_running: number
  readonly worker_count: number
}

export interface EvidenceRecord {
  readonly schema: "04_concurrent_task_queue-v1"
  readonly unit_id: "04_concurrent_task_queue"
  readonly project: "04_concurrent_task_queue"
  readonly scenario_id: string
  readonly game: "TASK FORGE"
  readonly ts: string
  readonly pass: boolean
  readonly gates: GateName[]
  readonly metrics: TaskForgeMetrics
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
    readonly scheduler_source: "learner-substrate"
    readonly verifier_required: true
  }
}

export interface EmitInput {
  readonly scenario_id: string
  readonly pass: boolean
  readonly gates: GateName[]
  readonly metrics: TaskForgeMetrics
  readonly scheduled_review: boolean
}

/** Build + emit one evidence record on wave clear. */
export function emitEvidence(input: EmitInput): EvidenceRecord {
  const record: EvidenceRecord = {
    schema: "04_concurrent_task_queue-v1",
    unit_id: "04_concurrent_task_queue",
    project: "04_concurrent_task_queue",
    scenario_id: input.scenario_id,
    game: "TASK FORGE",
    ts: new Date().toISOString(),
    pass: input.pass,
    gates: input.gates,
    metrics: input.metrics,
    curriculum_context: {
      concept:
        "bounded worker-pool dispatch with priority, retry/backoff, DLQ, backpressure, idempotency",
      mechanic: "task forge: hopper + N arms + annealing rack + scrap chute",
      accepted_signal:
        "correct next-dispatch prediction AND correct retry/DLQ classification AND held backpressure + idempotency",
      rejected_trap: "requeuing poison / overflowing hopper / enqueuing a duplicate sigil",
    },
    review_context: {
      unit_kind: "concept",
      scheduled_review: input.scheduled_review,
      review_reason: input.scheduled_review ? "due" : "deepening",
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
  }
  return dualEmit(record, "game")
}
