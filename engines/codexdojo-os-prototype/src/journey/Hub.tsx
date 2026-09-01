import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import { recommendMission } from '../missions/recommendation'
import {
  dailyGoalMet,
  dailyXp,
  missionKey,
  toLocalDateKey,
  type MissionStartOptions,
  type OsProgress,
} from '../progress/domain'
import { MentorPanel } from '../mentor/MentorPanel'
import { STUDENT_MISSION_CHAPTERS, listStudentRailMissions } from './studentPath'
import { useVerificationByMission } from './useVerificationByMission'

export function Hub({
  progress,
  learner,
  catalog,
  onLaunch,
  onOpenMap,
  onOpenProgress,
}: {
  readonly progress: OsProgress
  readonly learner: LearnerSnapshot
  readonly catalog: MissionCatalogRepository
  readonly onLaunch: (mission: MissionDefinition, options?: MissionStartOptions) => void
  readonly onOpenMap: () => void
  readonly onOpenProgress: () => void
  }) {
  const services = useServices()
  const { availability: verificationAvailability, setVerification, verificationByKey } = useVerificationByMission(
    catalog,
    services.verification,
  )
  const recommendation = recommendMission(progress, catalog, { learner, verificationByKey })
  const mission =
    'missionId' in recommendation
      ? catalog.get(recommendation.trackId, recommendation.missionId)
      : undefined
  const status = mission === undefined ? undefined : progress.missionStatusByKey[missionKey(mission.trackId, mission.id)]
  const activeTrackId = mission?.trackId ?? progress.onboarding.selectedTrackId ?? progress.activeTrackId ?? 'ai-pratica'
  const studentMissions = STUDENT_MISSION_CHAPTERS.flatMap((chapter) => listStudentRailMissions(catalog, chapter.trackId))
  const completedMission = [...studentMissions]
    .reverse()
    .find((item) => progress.missionStatusByKey[missionKey(item.trackId, item.id)] === 'completed')

  const verification = completedMission === undefined
    ? { kind: 'not-submitted' } as const
    : verificationByKey[missionKey(completedMission.trackId, completedMission.id)] ?? { kind: 'not-submitted' }
  const independentlyVerified = verification.kind === 'verified'
  const now = services.clock()
  const todayXp = dailyXp(progress, now)
  const trackRail = listStudentRailMissions(catalog, activeTrackId)
  const completedInTrack = trackRail.filter(
    (item) => progress.missionStatusByKey[missionKey(item.trackId, item.id)] === 'completed',
  ).length
  const lastActiveDate = progress.localEngagementStreak.lastActiveLocalDate
  const streakCopy = lastActiveDate === null
    ? 'Comece no seu ritmo: uma prática hoje já conta.'
    : lastActiveDate === toLocalDateKey(now)
      ? `Sequência local ativa: ${progress.localEngagementStreak.current} dia${progress.localEngagementStreak.current === 1 ? '' : 's'}.`
      : 'Volte no seu ritmo. Uma pausa não remove XP, conteúdo ou acesso.'
  const launchOptions: MissionStartOptions = recommendation.kind === 'review'
    ? { kind: 'review', canonicalReviewKey: recommendation.canonicalReviewKey }
    : recommendation.kind === 'targeted-practice'
      ? { kind: 'targeted-practice' }
      : recommendation.kind === 'retry'
        ? { kind: 'retry' }
        : { kind: 'initial' }
  const recommendationLabel = recommendation.kind === 'resume'
    ? 'Retomar missão'
    : recommendation.kind === 'review'
      ? `Revisão ${recommendation.reason === 'overdue' ? 'atrasada' : 'do dia'}`
      : recommendation.kind === 'targeted-practice'
        ? 'Prática direcionada'
        : recommendation.kind === 'retry'
          ? 'Recuperação guiada'
          : status === 'completed'
            ? 'Missão concluída'
            : 'Próxima missão'
  const actionLabel = recommendation.kind === 'resume'
    ? 'Continuar missão'
    : recommendation.kind === 'review'
      ? 'Revisar agora'
      : recommendation.kind === 'targeted-practice'
        ? 'Reforçar conceito'
        : recommendation.kind === 'retry'
          ? 'Tentar novamente'
          : status === 'completed'
            ? 'Praticar novamente'
            : 'Começar missão'

  return (
    <main className="journey-page hub-page">
      <header className="hub-topbar">
        <div className="journey-brand">
          <span className="journey-cubes" aria-hidden="true"><i /><i /><i /><i /></span>
          <span><strong>AI DevSchool</strong><small>hub de aprendizagem</small></span>
        </div>
        <div className="hub-chips">
          <span>Capítulo <strong>{activeTrackId === 'dev' ? 'Dev' : 'IA Prática'}</strong></span>
          <span>XP local <strong>{progress.xp}</strong></span>
          <span>Meta <strong>{todayXp}/{progress.dailyGoalXp}</strong></span>
        </div>
      </header>

      <section className="hub-welcome">
        <p className="journey-eyebrow">Seu próximo passo está pronto</p>
        <h1>Aprenda uma coisa útil agora.</h1>
        <p>Uma missão em destaque, com prática observável e progresso que não confunde conclusão com competência.</p>
      </section>

      {verificationAvailability === 'unavailable' ? (
        <p className="journey-eyebrow" role="status">Verificação indisponível no momento. Seu progresso local continua salvo.</p>
      ) : null}

      {completedMission !== undefined ? (
        <section className="honest-progress" aria-label="Estado da missão concluída">
          <div><span>1</span><strong>Atividade concluída</strong><small>Salva neste dispositivo</small></div>
          <div className={verification.kind === 'not-submitted' ? '' : 'current'}><span>2</span><strong>Evidência preservada</strong><small>{verification.kind === 'not-submitted' ? 'Ainda não enviada' : 'Separada do progresso local'}</small></div>
          <div className={independentlyVerified ? 'current' : ''}><span>3</span><strong>Verificação independente</strong><small>{independentlyVerified ? `Veredito ${verification.receipt.verdict}` : verification.kind === 'gateway-unavailable' ? 'Temporariamente indisponível' : 'Aguardando verificador'}</small></div>
          <div><span>4</span><strong>Competência canônica</strong><small>Não alterada por este fluxo</small></div>
          {verification.kind === 'gateway-unavailable' ? (
            <button
              type="button"
              onClick={() => void services.verification.retry(completedMission, (state) => {
                setVerification(completedMission, state)
              })}
            >Tentar verificação novamente</button>
          ) : null}
        </section>
      ) : null}

      <section className="hub-grid">
        <article className="next-mission-card">
          {mission === undefined ? (
            <>
              <p className="journey-eyebrow">Próximo território</p>
              <h2>Nenhuma missão pronta nesta trilha ainda</h2>
              <p>Não há outra missão disponível para esta trilha neste momento. Seu progresso foi preservado.</p>
            </>
          ) : (
            <>
              <p className="journey-eyebrow">
                {recommendationLabel} · {mission.estimatedMinutes} min
              </p>
              <h2>{mission.title}</h2>
              <p>{mission.objective}</p>
              <div
                className="hub-mission-progress"
                role="progressbar"
                aria-label="Missões concluídas nesta trilha"
                aria-valuemin={0}
                aria-valuemax={Math.max(trackRail.length, 1)}
                aria-valuenow={completedInTrack}
              >
                <span style={{ width: `${Math.round((completedInTrack / Math.max(trackRail.length, 1)) * 100)}%` }} />
              </div>
              <p className="mission-expected"><strong>Resultado esperado:</strong> {mission.fallback.summary}</p>
              <ol className="mission-stages">
                <li><span>1</span>Entender</li><li><span>2</span>Responder</li><li><span>3</span>Aplicar</li>
              </ol>
              <button type="button" className="journey-primary" onClick={() => onLaunch(mission, launchOptions)}>
                {actionLabel}
              </button>
            </>
          )}
          <div className="hub-voxels" aria-hidden="true"><i /><i /><i /><i /></div>
        </article>

        <aside className="hub-side">
          {mission === undefined ? null : (
            <MentorPanel mission={mission} stage="understand" learner={learner} />
          )}
          <article>
            <p className="journey-eyebrow">Ritmo local</p>
            <h2>{dailyGoalMet(progress, now) ? 'Meta de hoje alcançada' : `${Math.max(0, progress.dailyGoalXp - todayXp)} XP para a meta`}</h2>
            <p>{streakCopy}</p>
            <strong>{progress.achievements.length} conquistas locais</strong>
          </article>
          <article>
            <p className="journey-eyebrow">Progresso honesto</p>
            <h2>Conclusão não é domínio</h2>
            <p>O jogo e o mentor ajudam a produzir uma tentativa. A verificação independente é um requisito; este fluxo não altera o estado canônico.</p>
            <strong data-testid="canonical-mastery-count">{learner.masteredCount} competências verificadas</strong>
            <button type="button" className="hub-map-link" onClick={onOpenProgress}>Entender meu progresso</button>
          </article>
          <article>
            <p className="journey-eyebrow">Mapa compartilhado</p>
            <h2>Veja o capítulo inteiro</h2>
            <p>Missões bloqueadas, em andamento e concluídas permanecem visíveis no mapa.</p>
            <button type="button" className="hub-map-link" onClick={onOpenMap}>Abrir mapa</button>
          </article>
        </aside>
      </section>
    </main>
  )
}
