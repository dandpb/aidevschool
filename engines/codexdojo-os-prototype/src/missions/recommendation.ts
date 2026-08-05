import type { LearnerSnapshot, MissionKey, TrackId } from '../domain'
import type { EvidenceVerificationState } from '../verification/ports'
import type { MissionCatalogRepository } from './catalog'
import type { OsProgress } from '../progress/domain'
import { missionKey } from '../progress/domain'
import { mapCanonicalReviews, mapPitfallPractice } from './reviewMapping'

export type MissionRecommendation =
  | { readonly kind: 'onboarding' }
  | { readonly kind: 'resume'; readonly trackId: TrackId; readonly missionId: string }
  | {
      readonly kind: 'review'
      readonly trackId: TrackId
      readonly missionId: string
      readonly canonicalReviewKey: string
      readonly reason: 'overdue' | 'due'
      readonly dueIn: string
    }
  | {
      readonly kind: 'targeted-practice'
      readonly trackId: TrackId
      readonly missionId: string
      readonly pitfallId: string
    }
  | {
      readonly kind: 'retry'
      readonly trackId: TrackId
      readonly missionId: string
      readonly reason: 'failed-attempt' | 'failed-verification' | 'rejected-evidence'
    }
  | { readonly kind: 'start'; readonly trackId: TrackId; readonly missionId: string }
  | { readonly kind: 'none' }

export type RecommendationContext = {
  readonly learner?: LearnerSnapshot
  readonly verificationByKey?: Readonly<Partial<Record<MissionKey, EvidenceVerificationState>>>
}

function isLocallyLaunchable(progress: OsProgress, trackId: TrackId, missionId: string): boolean {
  return progress.missionStatusByKey[missionKey(trackId, missionId)] !== 'locked'
}

export function recommendMission(
  progress: OsProgress,
  catalog: MissionCatalogRepository,
  context: RecommendationContext = {},
): MissionRecommendation {
  if (!progress.onboarding.completed) return { kind: 'onboarding' }
  const trackId = progress.onboarding.selectedTrackId ?? progress.activeTrackId ?? 'ai-pratica'
  const trackMissions = catalog.listLaunchable(trackId)
  const inProgress = trackMissions.find(
    (mission) => progress.missionStatusByKey[missionKey(trackId, mission.id)] === 'in_progress',
  )
  if (inProgress !== undefined) {
    return { kind: 'resume', trackId, missionId: inProgress.id }
  }

  if (context.learner !== undefined) {
    const review = mapCanonicalReviews(context.learner, catalog, trackId).find((mapped) => {
      const engagement = progress.missionEngagementByKey[missionKey(trackId, mapped.mission.id)]
      return (
        isLocallyLaunchable(progress, trackId, mapped.mission.id) &&
        !engagement?.completedReviewKeys.includes(mapped.reviewKey)
      )
    })
    // mapCanonicalReviews already filters to overdue|due; this narrows the type.
    if (
      review !== undefined &&
      (review.review.reason === 'overdue' || review.review.reason === 'due')
    ) {
      return {
        kind: 'review',
        trackId,
        missionId: review.mission.id,
        canonicalReviewKey: review.reviewKey,
        reason: review.review.reason,
        dueIn: review.review.dueIn,
      }
    }
  }

  const verificationRetry = trackMissions.find((mission) => {
    const verification = context.verificationByKey?.[missionKey(trackId, mission.id)]
    return (
      isLocallyLaunchable(progress, trackId, mission.id) &&
      (verification?.kind === 'rejected' ||
        (verification?.kind === 'verified' && verification.receipt.verdict === 'FAIL'))
    )
  })
  if (verificationRetry !== undefined) {
    const verification = context.verificationByKey?.[missionKey(trackId, verificationRetry.id)]
    return {
      kind: 'retry',
      trackId,
      missionId: verificationRetry.id,
      reason: verification?.kind === 'rejected' ? 'rejected-evidence' : 'failed-verification',
    }
  }

  const localRetry = trackMissions.find((mission) => {
    const engagement = progress.missionEngagementByKey[missionKey(trackId, mission.id)]
    return (
      isLocallyLaunchable(progress, trackId, mission.id) && engagement?.retryRecommended === true
    )
  })
  if (localRetry !== undefined) {
    return { kind: 'retry', trackId, missionId: localRetry.id, reason: 'failed-attempt' }
  }

  const available = trackMissions.filter(
    (mission) => progress.missionStatusByKey[missionKey(trackId, mission.id)] === 'available',
  )
  const preferredId = progress.preferredNextMissionByTrack[trackId]
  const entryId = catalog
    .snapshot()
    .tracks.find((candidate) => candidate.id === trackId)?.recommendedEntryMissionId
  const chosen =
    available.find((mission) => mission.id === preferredId) ??
    available.find((mission) => mission.id === entryId) ??
    available[0]
  if (chosen !== undefined) return { kind: 'start', trackId: chosen.trackId, missionId: chosen.id }

  if (context.learner !== undefined) {
    const practice = mapPitfallPractice(context.learner, catalog, trackId).find(
      (mapped) =>
        progress.missionStatusByKey[missionKey(trackId, mapped.mission.id)] === 'completed',
    )
    if (practice !== undefined) {
      return {
        kind: 'targeted-practice',
        trackId,
        missionId: practice.mission.id,
        pitfallId: practice.pitfall.id,
      }
    }
  }

  return { kind: 'none' }
}
