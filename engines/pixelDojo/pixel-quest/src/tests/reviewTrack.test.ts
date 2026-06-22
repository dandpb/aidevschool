import { describe, expect, it } from "vitest"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import { createReviewTrack, updateReviewTrackFromEvidence } from "../game/review/reviewTrack"

describe("review track", () => {
  it("marks a passing scheduled review as verifier pending", () => {
    const track = createReviewTrack()
    const updated = updateReviewTrackFromEvidence(track, makeEvidence(true))

    expect(updated.active.status).toBe("verifier_pending")
    expect(updated.active.dueIn).toBe("gate pending")
    expect(updated.streak.current).toBe(track.streak.current)
    expect(updated.streak.pendingGateDelta).toBe(1)
  })

  it("keeps a failed scheduled review due for retry", () => {
    const updated = updateReviewTrackFromEvidence(createReviewTrack(), makeEvidence(false))

    expect(updated.active.status).toBe("retry_due")
    expect(updated.active.dueIn).toBe("retry due now")
    expect(updated.streak.pendingGateDelta).toBe(0)
  })
})

function makeEvidence(pass: boolean): PixelQuestEvidenceRecord {
  return {
    source: "pixelquest",
    unit_id: "U0-sonda-rate-limiter-robustness",
    project: "01_rate_limiter",
    encounter_id: "encounter-token-bucket-01",
    game: "PixelDojo Quest",
    ts: "2026-06-11T12:00:00.000Z",
    pass,
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
}
