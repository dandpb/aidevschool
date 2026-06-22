import { describe, expect, it } from "vitest"
import { EvidenceValidationError, validateEvidenceRecord } from "../game/evidence/evidence"

describe("evidence validation", () => {
  it("accepts verifier-owned review context on a scheduled attempt", () => {
    const raw = {
      source: "pixelquest",
      unit_id: "U0-sonda-rate-limiter-robustness",
      project: "01_rate_limiter",
      encounter_id: "encounter-token-bucket-01",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        target_rate: 1.5,
        observed_admit_rate: 0.72,
        max_burst_1s: 2,
        good_admits: 8,
        legit_rejected: 0,
        abusive_admitted: 0,
        abusive_rejected: 4,
        heat_peak: 56,
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
      encounter_id: "encounter-token-bucket-01",
      game: "PixelDojo Quest",
      ts: "2026-06-11T12:00:00.000Z",
      pass: true,
      metrics: {
        target_rate: 1.5,
        observed_admit_rate: 0.72,
        max_burst_1s: 2,
        good_admits: 8,
        legit_rejected: 0,
        abusive_admitted: 0,
        abusive_rejected: 4,
        heat_peak: 56,
        overheated: false,
      },
    }

    expect(() => validateEvidenceRecord(raw)).toThrow(EvidenceValidationError)
  })
})
