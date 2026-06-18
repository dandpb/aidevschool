import { describe, expect, it } from "vitest"
import { EvidenceValidationError, validateEvidenceRecord } from "../game/evidence/evidence"

describe("evidence validation", () => {
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
