import { dualEmit } from "../../../../shared/evidence"
// Timeline Tower — evidence emitter (produces the contract record on win).
//
// Durable channel: the Playwright smoke captures the in-page
// `window.__gameEvidence` object AND the `EVIDENCE <json>` console line. The
// game emits evidence only — it never writes learner state, never publishes
// `window.__pixelQuestLearningState`, never touches localStorage keys
// `learning_state` / `units_log` / `mastered`. The verifier subagent owns
// the mastery transition.

import type { LevelEvaluation, OrderTower, TowerMetrics } from "./logic"

export type TimelineTowerMetrics = {
  readonly kind: "timeline-tower"
  readonly level: number
  readonly orders_completed: number
  readonly events_appended: number
  readonly invalid_transitions_rejected: number
  readonly invalid_transitions_accepted: number
  readonly outbox_backlog_peak: number
  readonly projection_lag_peak_events: number
  readonly saga_compensations: number
  readonly replay_performed: boolean
  readonly projection_desync_after_replay: boolean
}

export type EvidenceGate = {
  readonly name: string
  readonly passed: boolean
  readonly value: number
  readonly target: number
}

export type TimelineTowerEvidenceRecord = {
  readonly schema: "08_event_driven_order_system-v1"
  readonly source: "pixeldojo"
  readonly unit_id: "08_event_driven_order_system"
  readonly project: "08_event_driven_order_system"
  readonly game: "Timeline Tower"
  readonly scenario_id: string
  readonly ts: string
  readonly pass: boolean
  readonly gates: readonly EvidenceGate[]
  readonly metrics: TimelineTowerMetrics
  readonly curriculum_context: {
    readonly concept: string
    readonly mechanic: string
    readonly accepted_signal: string
    readonly rejected_trap: string
  }
  readonly review_context: {
    readonly scheduled_review: false
    readonly review_reason: "deepening"
    readonly verifier_required: true
  }
}

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvidenceValidationError"
  }
}

function toMetrics(tower: OrderTower): TimelineTowerMetrics {
  const m: TowerMetrics = tower.metrics
  return {
    kind: "timeline-tower",
    level: tower.level.level,
    orders_completed: m.orders_completed,
    events_appended: m.events_appended,
    invalid_transitions_rejected: m.invalid_transitions_rejected,
    invalid_transitions_accepted: m.invalid_transitions_accepted,
    outbox_backlog_peak: m.outbox_backlog_peak,
    projection_lag_peak_events: m.projection_lag_peak_events,
    saga_compensations: m.saga_compensations,
    replay_performed: m.replay_performed,
    projection_desync_after_replay: m.projection_desync_after_replay,
  }
}

function toGates(eval_: LevelEvaluation): readonly EvidenceGate[] {
  return eval_.gates.map((g) => ({
    name: g.name,
    passed: g.passed,
    value: g.value,
    target: g.target,
  }))
}

export function buildEvidence(
  tower: OrderTower,
  evaluation: LevelEvaluation,
  scenarioId: string,
  now: Date,
): TimelineTowerEvidenceRecord {
  const record: TimelineTowerEvidenceRecord = {
    schema: "08_event_driven_order_system-v1",
    source: "pixeldojo",
    unit_id: "08_event_driven_order_system",
    project: "08_event_driven_order_system",
    game: "Timeline Tower",
    scenario_id: scenarioId,
    ts: now.toISOString(),
    pass: evaluation.passed,
    gates: toGates(evaluation),
    metrics: toMetrics(tower),
    curriculum_context: {
      concept: "event-sourced order lifecycle with async projections",
      mechanic: "Timeline Tower (3D event-log tower + projection sphere + replay crank)",
      accepted_signal:
        "lifecycle floors appended in order; projection catches up; replay rebuilds matching sphere",
      rejected_trap:
        "skipping the projection/replay step; outbox left to overflow; invalid transition accepted",
    },
    review_context: {
      scheduled_review: false,
      review_reason: "deepening",
      verifier_required: true,
    },
  }
  return validateEvidenceRecord(record)
}

export function validateEvidenceRecord(
  record: TimelineTowerEvidenceRecord,
): TimelineTowerEvidenceRecord {
  if (record.schema !== "08_event_driven_order_system-v1") {
    throw new EvidenceValidationError("schema must be 08_event_driven_order_system-v1")
  }
  if (record.source !== "pixeldojo") {
    throw new EvidenceValidationError("source must be pixeldojo")
  }
  if (record.unit_id !== "08_event_driven_order_system") {
    throw new EvidenceValidationError("unit_id must be 08_event_driven_order_system")
  }
  if (record.project !== "08_event_driven_order_system") {
    throw new EvidenceValidationError("project must be 08_event_driven_order_system")
  }
  if (record.game !== "Timeline Tower") {
    throw new EvidenceValidationError("game must be Timeline Tower")
  }
  if (typeof record.ts !== "string" || Number.isNaN(Date.parse(record.ts))) {
    throw new EvidenceValidationError("ts must be ISO timestamp")
  }
  if (typeof record.pass !== "boolean") {
    throw new EvidenceValidationError("pass must be boolean")
  }
  if (record.metrics.kind !== "timeline-tower") {
    throw new EvidenceValidationError("metrics.kind must be timeline-tower")
  }
  for (const gate of record.gates) {
    if (typeof gate.name !== "string" || gate.name === "") {
      throw new EvidenceValidationError("gate.name must be non-empty string")
    }
    if (typeof gate.passed !== "boolean") {
      throw new EvidenceValidationError(`gate ${gate.name} passed must be boolean`)
    }
  }
  if (record.review_context.verifier_required !== true) {
    throw new EvidenceValidationError("review_context.verifier_required must be true")
  }
  return record
}

// Single typed emission point. Validates the record, stores it on the window
// channel, and prints the `EVIDENCE <json>` line for stdout-scraping harnesses.
export function emitEvidence(record: TimelineTowerEvidenceRecord): TimelineTowerEvidenceRecord {
  const valid = validateEvidenceRecord(record)
  return dualEmit(valid, "game")
}
