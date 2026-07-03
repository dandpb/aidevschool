import { describe, expect, it } from "vitest"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import { createReviewTrack, updateReviewTrackFromEvidence } from "../game/review/reviewTrack"

describe("review track", () => {
  it("marks a passing scheduled review as verifier pending", () => {
    const track = createReviewTrack()
    const updated = updateReviewTrackFromEvidence(track, makeEvidence(true, track.active.unitId))

    expect(updated.active.status).toBe("verifier_pending")
    expect(updated.active.dueIn).toBe("gate pending")
    expect(updated.streak.current).toBe(track.streak.current)
    expect(updated.streak.pendingGateDelta).toBe(1)
  })

  it("keeps a failed scheduled review due for retry", () => {
    const track = createReviewTrack()
    const updated = updateReviewTrackFromEvidence(track, makeEvidence(false, track.active.unitId))

    expect(updated.active.status).toBe("retry_due")
    expect(updated.active.dueIn).toBe("retry due now")
    expect(updated.streak.pendingGateDelta).toBe(0)
  })
})

function makeEvidence(pass: boolean, unitId: string): PixelQuestEvidenceRecord {
  return {
    source: "pixelquest",
    unit_id: unitId,
    project: "01_rate_limiter",
    encounter_id: "encounter-agent-quest-01",
    game: "PixelDojo Quest",
    ts: "2026-06-11T12:00:00.000Z",
    pass,
    metrics: {
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
}
