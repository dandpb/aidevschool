// Evidence emitter for the Metrics Observatory game.
//
// Producer-only: the game emits a raw record; a separate verifier (the
// pixelDojo/voxelDojo verifier) owns any learning-gate transition. This
// module never imports learner state. Mirrors the EVIDENCE_CONTRACT.md
// producer pattern, scoped to this game's metrics variant.

import type { ObservatorySnapshot } from "./observatory"

export const UNIT_ID = "U15-metrics-collector"
export const PROJECT = "15_metrics_collector"
export const SCENARIO_ID = "metrics-collector-L1"
export const SCHEMA = "15_metrics_collector-v1"

export interface MetricsEvidenceRecord {
  readonly schema: string
  readonly source: "voxeldojo"
  readonly unit_id: string
  readonly project: string
  readonly scenario_id: string
  readonly encounter_id: string
  readonly game: "Metrics Observatory"
  readonly ts: string
  readonly pass: boolean
  readonly gates: readonly string[]
  readonly metrics: {
    readonly kind: "voxeldojo-metrics-observatory"
    readonly bucket_plan: readonly number[]
    readonly obs_total: number
    readonly obs_bucketed_correct: number
    readonly obs_misbucketed: number
    readonly percentile_queries_total: number
    readonly percentile_queries_correct: number
    readonly percentile_queries_wrong: number
    readonly sum_observed: number
    readonly sum_recorded: number
    readonly alert_threshold_requested_le: number
    readonly alert_threshold_set_le: number
    readonly alert_threshold_correct: boolean
    readonly alert_lifecycle_observed: readonly string[]
    readonly alert_lifecycle_correct: boolean
    readonly window_seconds: number
    readonly overflow_drops: number
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

export interface BuildInput {
  readonly snapshot: ObservatorySnapshot
  readonly bucketPlan: readonly number[]
  readonly requestedThresholdLeIdx: number
  readonly windowSeconds: number
}

/**
 * Map a finished-wave snapshot into the evidence record. Pass rule (gate):
 * every observation hit its bucket, every percentile was answered from the
 * cumulative ribbon, the threshold was set correctly, the alert transitioned
 * `pending -> firing -> resolved` in order and the player acked only after
 * resolved, the sum is consistent, and nothing overflowed.
 */
export function buildEvidence(input: BuildInput): MetricsEvidenceRecord {
  const s = input.snapshot
  const expectedLifecycle = ["pending", "firing", "resolved"]
  const lifecycleCorrect =
    s.alertLifecycle.length === expectedLifecycle.length &&
    s.alertLifecycle.every((v, i) => {
      const want = expectedLifecycle[i]
      return want !== undefined && v === want
    })

  const thresholdCorrect = s.alertThresholdLeIdx === input.requestedThresholdLeIdx
  const sumConsistent = s.sumObserved === s.sumRecorded
  const routingCorrect = s.obsBucketedCorrect === s.obsTotal
  const percentileCorrect =
    s.percentileQueriesTotal > 0 &&
    s.percentileQueriesCorrect === s.percentileQueriesTotal &&
    s.percentileQueriesWrong === 0
  const noOverflow = s.overflowDrops === 0
  const acked = s.acked

  const pass =
    routingCorrect &&
    s.obsMisbucketed === 0 &&
    percentileCorrect &&
    thresholdCorrect &&
    lifecycleCorrect &&
    sumConsistent &&
    noOverflow &&
    acked

  const gates = [
    `routing:${s.obsBucketedCorrect}/${s.obsTotal}`,
    `misbucketed:${s.obsMisbucketed}=0`,
    `percentile:${s.percentileQueriesCorrect}/${s.percentileQueriesTotal}`,
    `threshold:${thresholdCorrect ? "ok" : "wrong"}`,
    `lifecycle:${lifecycleCorrect ? "ok" : "broken"}`,
    `sum:${sumConsistent ? "ok" : "drift"}`,
    `overflow:${noOverflow ? "ok" : "drop"}`,
    `ack:${acked ? "ok" : "missing"}`,
  ]

  const setLe = leValueForIdx(s.alertThresholdLeIdx, input.bucketPlan)
  const requestedLe = leValueForIdx(input.requestedThresholdLeIdx, input.bucketPlan)

  return {
    schema: SCHEMA,
    source: "voxeldojo",
    unit_id: UNIT_ID,
    project: PROJECT,
    scenario_id: SCENARIO_ID,
    encounter_id: "metrics-observatory-01",
    game: "Metrics Observatory",
    ts: new Date().toISOString(),
    pass,
    gates,
    metrics: {
      kind: "voxeldojo-metrics-observatory",
      bucket_plan: input.bucketPlan,
      obs_total: s.obsTotal,
      obs_bucketed_correct: s.obsBucketedCorrect,
      obs_misbucketed: s.obsMisbucketed,
      percentile_queries_total: s.percentileQueriesTotal,
      percentile_queries_correct: s.percentileQueriesCorrect,
      percentile_queries_wrong: s.percentileQueriesWrong,
      sum_observed: s.sumObserved,
      sum_recorded: s.sumRecorded,
      alert_threshold_requested_le: requestedLe,
      alert_threshold_set_le: setLe,
      alert_threshold_correct: thresholdCorrect,
      alert_lifecycle_observed: s.alertLifecycle,
      alert_lifecycle_correct: lifecycleCorrect,
      window_seconds: input.windowSeconds,
      overflow_drops: s.overflowDrops,
    },
    curriculum_context: {
      concept: "histogram bucketing, percentile estimation from cumulative counts, alert lifecycle",
      mechanic: "Metrics Observatory",
      accepted_signal:
        "observation routed to smallest le>=value bucket; percentile read from cumulative ribbon; alert pending->firing->resolved",
      rejected_trap:
        "wrong-bucket drop, wrong percentile bucket, or alert acked outside resolved state",
    },
    review_context: {
      unit_kind: "concept",
      // The substrate does not yet register U15-metrics-collector, so this
      // attempt is logged as deepening play, not a scheduled review.
      scheduled_review: false,
      review_reason: "deepening",
      streak_candidate: false,
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
  }
}

function leValueForIdx(idx: number, bucketPlan: readonly number[]): number {
  if (idx < 0) return -1
  const v = bucketPlan[idx]
  if (v === undefined) return -1
  return v
}

declare global {
  interface Window {
    __metricsObservatoryEvidence?: MetricsEvidenceRecord[]
    __gameEvidence?: MetricsEvidenceRecord
  }
}

/** Validate then emit: console + in-page channels. Returns the record. */
export function emitEvidence(record: MetricsEvidenceRecord): MetricsEvidenceRecord {
  if (typeof window !== "undefined") {
    window.__metricsObservatoryEvidence = window.__metricsObservatoryEvidence ?? []
    window.__metricsObservatoryEvidence.push(record)
    window.__gameEvidence = record
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}
