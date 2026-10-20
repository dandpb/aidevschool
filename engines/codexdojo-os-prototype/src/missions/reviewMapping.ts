import type { LearnerSnapshot, MissionDefinition, TrackId } from '../domain'
import type { MissionCatalogRepository } from './catalog'

export type CanonicalReviewFact = LearnerSnapshot['nextReviews'][number]
export type CanonicalPitfallFact = LearnerSnapshot['topPitfalls'][number]

export type MappedCanonicalReview = {
  readonly mission: MissionDefinition
  readonly review: CanonicalReviewFact
  readonly reviewKey: string
}

export type MappedPitfallPractice = {
  readonly mission: MissionDefinition
  readonly pitfall: CanonicalPitfallFact
}

type DeclaredMissionPractice = {
  readonly trackId: TrackId
  readonly missionId: string
}

const DECLARED_PITFALL_PRACTICE: Readonly<Record<string, DeclaredMissionPractice>> = {
  'P-001': { trackId: 'ai-pratica', missionId: 'l02' },
}

export function canonicalReviewKey(review: CanonicalReviewFact): string {
  return `${review.unitId}:${review.reason}:${review.dueIn}`
}

/**
 * W7 AID-5190 (contrato §7.2 — papel ReviewDue): o substrate emite `dueIn`
 * em formato de máquina ("overdue 43d", "today", "in 5d"); a HUD do OS
 * apresenta o texto pt-BR legível ("atrasada 43 dias" / "devida hoje").
 * A projeção canônica permanece intacta — isto é só apresentação.
 */
export function formatReviewDuePtBr(dueIn: string): string {
  const overdue = dueIn.match(/^overdue (\d+)d$/)
  if (overdue !== null) {
    const days = Number(overdue[1])
    return `atrasada ${days} ${days === 1 ? 'dia' : 'dias'}`
  }
  if (dueIn === 'today') return 'devida hoje'
  if (dueIn === 'tomorrow') return 'devida amanhã'
  const upcoming = dueIn.match(/^in (\d+)d$/)
  if (upcoming !== null) {
    const days = Number(upcoming[1])
    return `em ${days} ${days === 1 ? 'dia' : 'dias'}`
  }
  return dueIn
}

export function mapCanonicalReviews(
  learner: LearnerSnapshot,
  catalog: MissionCatalogRepository,
  trackId: TrackId,
): readonly MappedCanonicalReview[] {
  const missions = catalog.listLaunchable(trackId)
  return learner.nextReviews
    .filter((review) => review.reason === 'overdue' || review.reason === 'due')
    .flatMap((review) => {
      const mission = missions.find((candidate) => candidate.unitId === review.unitId)
      return mission === undefined
        ? []
        : [{ mission, review, reviewKey: canonicalReviewKey(review) }]
    })
    .sort((left, right) => {
      if (left.review.reason !== right.review.reason) return left.review.reason === 'overdue' ? -1 : 1
      return left.mission.chapterOrder - right.mission.chapterOrder
    })
}

export function mapPitfallPractice(
  learner: LearnerSnapshot,
  catalog: MissionCatalogRepository,
  trackId: TrackId,
): readonly MappedPitfallPractice[] {
  return [...learner.topPitfalls]
    .sort((left, right) => right.occurrences - left.occurrences || right.lastSeen.localeCompare(left.lastSeen))
    .flatMap((pitfall) => {
      const declaration = DECLARED_PITFALL_PRACTICE[pitfall.id]
      if (declaration === undefined || declaration.trackId !== trackId) return []
      const mission = catalog.get(declaration.trackId, declaration.missionId)
      return mission === undefined ? [] : [{ mission, pitfall }]
    })
}

export function missionHasCanonicalMastery(
  mission: MissionDefinition,
  learner: LearnerSnapshot,
): boolean {
  return (
    (learner.activeUnit.id === mission.unitId && learner.activeUnit.state === 'mastered') ||
    learner.challenges.some((challenge) => challenge.id === mission.projectId && challenge.passed)
  )
}
