import { describe, expect, it } from "vitest"
import type { PixelQuestEvidenceRecord } from "../game/evidence/types"
import { createReviewTrack, updateReviewTrackFromEvidence } from "../game/review/reviewTrack"
import { makeTokenBucketEvidence } from "./fixtures/evidence"

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
  return makeTokenBucketEvidence(pass, { unit_id: unitId })
}
