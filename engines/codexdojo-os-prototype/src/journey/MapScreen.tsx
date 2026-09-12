import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import { missionHasCanonicalMastery } from '../missions/reviewMapping'
import { recommendMission } from '../missions/recommendation'
import { missionKey, type OsProgress } from '../progress/domain'
import type { EvidenceVerificationState } from '../verification/ports'
import { STUDENT_MISSION_CHAPTERS, STUDENT_TRACK_ID, listStudentRailMissions } from './studentPath'
import { useVerificationByMission } from './useVerificationByMission'

type MapOverlay = 'available' | 'in-progress' | 'completed' | 'evidence-pending' | 'verified' | 'canonical-mastery' | 'locked'

const OVERLAY_LABEL: Readonly<Record<MapOverlay, string>> = {
  available: 'Disponível',
  'in-progress': 'Em andamento',
  completed: 'Concluída neste dispositivo',
  'evidence-pending': 'Evidência aguardando verificação',
  verified: 'Verificação independente concluída',
  'canonical-mastery': 'Competência canônica verificada',
  locked: 'Bloqueada por pré-requisito',
}

function overlayFor(
  mission: MissionDefinition,
  progress: OsProgress,
  learner: LearnerSnapshot,
  verification: EvidenceVerificationState | undefined,
): MapOverlay {
  if (missionHasCanonicalMastery(mission, learner)) return 'canonical-mastery'
  if (verification?.kind === 'verified') return 'verified'
  if (
    verification?.kind === 'validating' ||
    verification?.kind === 'pending' ||
    verification?.kind === 'gateway-unavailable'
  ) return 'evidence-pending'
  const status = progress.missionStatusByKey[missionKey(mission.trackId, mission.id)]
  if (status === 'in_progress') return 'in-progress'
  if (status === 'completed') return 'completed'
  return status ?? 'locked'
}

export function MapScreen({
  progress,
  learner,
  catalog,
  onLaunch,
  onBack,
}: {
  readonly progress: OsProgress
  readonly learner: LearnerSnapshot
  readonly catalog: MissionCatalogRepository
  readonly onLaunch: (mission: MissionDefinition) => void
  readonly onBack: () => void
}) {
  const services = useServices()
  const { availability: verificationAvailability, verificationByKey } = useVerificationByMission(catalog, services.verification)
  const publishedMissionCount = listStudentRailMissions(catalog).length

  // F1 2026-09-10-activation-first-activity (R3): o mapa espelha a recomendação
  // do Hub — mesma fonte única `recommendMission`. Badge "Comece aqui" SOMENTE
  // para kinds start/resume; review/prática/recuperação mantêm labels próprios.
  // Apresentação aditiva: overlays, travas e studentPath inalterados.
  const recommendation = recommendMission(progress, catalog, { learner, verificationByKey })
  const startHereMission =
    recommendation.kind === 'start' || recommendation.kind === 'resume'
      ? { trackId: recommendation.trackId, missionId: recommendation.missionId }
      : null
  // Trilha ativa espelha o Hub: trackId da recomendação quando existe (mesma
  // fonte), senão a seleção do onboarding/estado local.
  const activeTrackId =
    ('trackId' in recommendation ? recommendation.trackId : null)
    ?? progress.onboarding.selectedTrackId
    ?? progress.activeTrackId
    ?? STUDENT_TRACK_ID
  const activeChapter = STUDENT_MISSION_CHAPTERS.find((chapter) => chapter.trackId === activeTrackId)

  return (
    <main className="journey-page chapter-map-page" data-testid="chapter-map">
      <header className="chapter-map-header">
        <button type="button" className="journey-back" onClick={onBack}>← Hub</button>
        <div>
          <p className="journey-eyebrow">Mapa de missões</p>
          <h1>{publishedMissionCount} missões, uma sequência</h1>
          <p>Escolha IA Prática (l01–l03) ou Dev (WAREHOUSE, WORMHOLE e RELAY STATION). O restante fica no Hub, não neste trilho.</p>
          {activeChapter !== undefined ? (
            <p className="journey-eyebrow" data-testid="map-active-chapter">
              Trilha ativa: {activeChapter.label} — {activeChapter.detail}
            </p>
          ) : null}
        </div>
      </header>
      {verificationAvailability === 'unavailable' ? (
        <p className="journey-eyebrow" role="status">Verificação indisponível no momento. Seu progresso local continua salvo.</p>
      ) : null}
      <div className="chapter-map-grid">
        {STUDENT_MISSION_CHAPTERS.map((chapter) => (
          <section key={chapter.id} className="chapter-track active">
            <p className="journey-eyebrow">{chapter.label}</p>
            <h2>{chapter.detail}</h2>
            <ol>
              {listStudentRailMissions(catalog, chapter.trackId).map((mission) => {
                const key = missionKey(chapter.trackId, mission.id)
                const overlay = overlayFor(mission, progress, learner, verificationByKey[key])
                const launchable = overlay !== 'locked'
                const showStartHere =
                  startHereMission !== null &&
                  chapter.trackId === startHereMission.trackId &&
                  mission.id === startHereMission.missionId
                return (
                  <li key={mission.id} className={`mission-map-node ${overlay}`}>
                    <span className="mission-map-order">{mission.chapterOrder}</span>
                    <div>
                      <small data-testid={`map-overlay-${mission.id}`}>{OVERLAY_LABEL[overlay]}</small>
                      {showStartHere ? (
                        <strong className="journey-eyebrow" data-testid={`map-start-here-${mission.id}`}>
                          Comece aqui
                        </strong>
                      ) : null}
                      <h3>{mission.title}</h3>
                      <p>{mission.estimatedMinutes} min · {mission.objective}</p>
                      {mission.prerequisites.length > 0 ? (
                        <span>Pré-requisito: {mission.prerequisites.join(', ')}</span>
                      ) : null}
                    </div>
                    <button type="button" disabled={!launchable} onClick={() => onLaunch(mission)}>
                      {overlay === 'in-progress' ? 'Continuar' : overlay === 'completed' ? 'Revisitar' : 'Abrir'}
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </main>
  )
}
