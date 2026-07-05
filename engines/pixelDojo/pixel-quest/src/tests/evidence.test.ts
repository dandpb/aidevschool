import { describe, expect, it } from "vitest"
import { EvidenceValidationError, validateEvidenceRecord } from "../game/evidence/evidence"

describe("evidence validation", () => {
  it("accepts verifier-owned review context on a scheduled attempt", () => {
    const raw = {
      source: "pixelquest",
      unit_id: "U0-sonda-rate-limiter-robustness",
      project: "01_rate_limiter",
      encounter_id: "encounter-agent-quest-01",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        kind: "pixelquest-token-bucket",
        target_rate: 5,
        observed_admit_rate: 0.5,
        max_burst_1s: 5,
        good_admits: 5,
        legit_rejected: 0,
        abusive_admitted: 0,
        abusive_rejected: 5,
        heat_peak: 0,
        overheated: false,
      },
      review_context: {
        unit_kind: "concept",
        scheduled_review: true,
        review_reason: "due",
        streak_candidate: true,
        scheduler_source: "learner-substrate",
        verifier_required: true,
      },
    }

    expect(validateEvidenceRecord(raw).review_context).toMatchObject({
      scheduled_review: true,
      streak_candidate: true,
      verifier_required: true,
    })
  })

  it("rejects evidence without a unit id", () => {
    const raw = {
      source: "pixelquest",
      project: "01_rate_limiter",
      encounter_id: "encounter-agent-quest-01",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        kind: "pixelquest-token-bucket",
        target_rate: 5,
        observed_admit_rate: 0.5,
        max_burst_1s: 5,
        good_admits: 5,
        legit_rejected: 0,
        abusive_admitted: 0,
        abusive_rejected: 5,
        heat_peak: 0,
        overheated: false,
      },
    }

    expect(() => validateEvidenceRecord(raw)).toThrow(EvidenceValidationError)
  })

  it("accepts route-health metrics variant", () => {
    const raw = {
      source: "pixelquest",
      unit_id: "U-11_load_balancer",
      project: "11_load_balancer",
      encounter_id: "encounter-11_load_balancer",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        kind: "pixelquest-route-health",
        routed: 3,
        isolated: 2,
        bad_routes: 0,
        good_rejected: 0,
        heat_peak: 0,
        overheated: false,
      },
    }

    expect(validateEvidenceRecord(raw).metrics).toMatchObject({
      kind: "pixelquest-route-health",
      routed: 3,
    })
  })

  it("accepts policy-gate metrics variant", () => {
    const raw = {
      source: "pixelquest",
      unit_id: "U-07_rest_api_auth",
      project: "07_rest_api_auth",
      encounter_id: "encounter-07_rest_api_auth",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        kind: "pixelquest-policy-gate",
        allowed: 3,
        denied: 3,
        policy_leaks: 0,
        false_denies: 0,
        heat_peak: 0,
        overheated: false,
      },
    }

    expect(validateEvidenceRecord(raw).metrics).toMatchObject({
      kind: "pixelquest-policy-gate",
      allowed: 3,
    })
  })

  it("accepts sequence-flow metrics variant", () => {
    const raw = {
      source: "pixelquest",
      unit_id: "U-16_mini_message_queue",
      project: "16_mini_message_queue",
      encounter_id: "encounter-16_mini_message_queue",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        kind: "pixelquest-sequence-flow",
        advanced: 3,
        held: 2,
        skipped_required: 0,
        guards_missed: 0,
        heat_peak: 0,
        overheated: false,
      },
    }

    expect(validateEvidenceRecord(raw).metrics).toMatchObject({
      kind: "pixelquest-sequence-flow",
      advanced: 3,
    })
  })

  it("rejects evidence with an unknown metrics kind", () => {
    const raw = {
      source: "pixelquest",
      unit_id: "U0-sonda-rate-limiter-robustness",
      project: "01_rate_limiter",
      encounter_id: "encounter-agent-quest-01",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        kind: "pixelquest-unknown",
        foo: 1,
      },
    }

    expect(() => validateEvidenceRecord(raw)).toThrow(EvidenceValidationError)
  })
})
