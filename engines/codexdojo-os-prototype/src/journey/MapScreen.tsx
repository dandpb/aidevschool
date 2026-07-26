import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition, TrackId } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import { missionHasCanonicalMastery } from '../missions/reviewMapping'
import { missionKey, type OsProgress } from '../progress/domain'
import type { EvidenceVerificationState } from '../verification/ports'
import { TrackSwitcher } from './TrackSwitcher'
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
  onSwitchTrack,
  onBack,
}: {
  readonly progress: OsProgress
  readonly learner: LearnerSnapshot
  readonly catalog: MissionCatalogRepository
  readonly onLaunch: (mission: MissionDefinition) => void
  readonly onSwitchTrack: (trackId: TrackId) => void
  readonly onBack: () => void
}) {
  const services = useServices()
  const { availability: verificationAvailability, verificationByKey } = useVerificationByMission(catalog, services.verification)
  const activeTrackId = progress.onboarding.selectedTrackId ?? progress.activeTrackId ?? 'ai-pratica'

  return (
    <main className="journey-page chapter-map-page" data-testid="chapter-map">
      <header className="chapter-map-header">
        <button type="button" className="journey-back" onClick={onBack}>← Hub</button>
        <div>
          <p className="journey-eyebrow">Primeiro capítulo</p>
          <h1>Duas trilhas, seis missões</h1>
          <p>Troque de trilha sem apagar conclusões, evidências ou verificações da outra jornada.</p>
        </div>
      </header>
      <TrackSwitcher activeTrackId={activeTrackId} onSwitch={onSwitchTrack} />
      {verificationAvailability === 'unavailable' ? (
        <p className="journey-eyebrow" role="status">Verificação indisponível no momento. Seu progresso local continua salvo.</p>
      ) : null}
      <div className="chapter-map-grid">
        {(['ai-pratica', 'dev'] as const).map((trackId) => (
          <section key={trackId} className={activeTrackId === trackId ? 'chapter-track active' : 'chapter-track'}>
            <p className="journey-eyebrow">{trackId === 'dev' ? 'Trilha Dev' : 'IA Prática'}</p>
            <h2>{trackId === 'dev' ? 'Sistemas que você pode manipular' : 'Critério para usar IA no trabalho'}</h2>
            <ol>
              {catalog.listLaunchable(trackId).map((mission) => {
                const key = missionKey(trackId, mission.id)
                const overlay = overlayFor(mission, progress, learner, verificationByKey[key])
                const launchable = overlay !== 'locked'
                return (
                  <li key={mission.id} className={`mission-map-node ${overlay}`}>
                    <span className="mission-map-order">{mission.chapterOrder}</span>
                    <div>
                      <small>{OVERLAY_LABEL[overlay]}</small>
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
