import { reviewSlice } from "../../content/reviewSlice"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import type { ReviewProjection, ReviewTrack } from "./types"

/**
 * Fallback unit id when the generated slice has no scheduled review yet. Kept as
 * a named constant so tests and the slice generator stay in sync.
 */
export const fallbackReviewUnitId = "U0-sonda-rate-limiter-robustness"

function activeProjectionFromSlice(): ReviewProjection {
  const next = reviewSlice.nextReviews[0]
  if (next === undefined) {
    return {
      unitId: fallbackReviewUnitId,
      title: "(nenhuma revisão agendada)",
      dueIn: "today",
      reason: "due",
      status: "due",
    }
  }
  return {
    unitId: next.unitId,
    title: next.title,
    dueIn: next.dueIn,
    reason: next.reason,
    status: "due",
  }
}

export function createReviewTrack(): ReviewTrack {
  return {
    active: activeProjectionFromSlice(),
    streak: {
      current: reviewSlice.streak.current,
      longest: reviewSlice.streak.longest,
      freezesEquipped: reviewSlice.streak.freezesEquipped,
      freezesMax: reviewSlice.streak.freezesMax,
      daysToBreak: null,
      pendingGateDelta: 0,
    },
    schedulerSource: "learner-substrate",
    verifierRequired: true,
  }
}

export function updateReviewTrackFromEvidence(
  track: ReviewTrack,
  evidence: PixelQuestEvidenceRecord,
): ReviewTrack {
  if (evidence.unit_id !== track.active.unitId) {
    return track
  }
  const passed = evidence.pass
  return {
    ...track,
    active: {
      ...track.active,
      dueIn: passed ? "gate pending" : "retry due now",
      status: passed ? "verifier_pending" : "retry_due",
    },
    streak: {
      ...track.streak,
      pendingGateDelta: passed ? 1 : 0,
    },
  }
}

export function attachReviewContext(
  evidence: PixelQuestEvidenceRecord,
  track: ReviewTrack,
): PixelQuestEvidenceRecord {
  return {
    ...evidence,
    review_context: {
      unit_kind: "concept",
      scheduled_review: evidence.unit_id === track.active.unitId,
      review_reason: track.active.reason,
      streak_candidate: evidence.pass,
      scheduler_source: track.schedulerSource,
      verifier_required: track.verifierRequired,
    },
  }
}
