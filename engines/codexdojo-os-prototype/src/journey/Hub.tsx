import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import { recommendMission } from '../missions/recommendation'
import { missionKey, type OsProgress } from '../progress/domain'

export function Hub({
  progress,
  learner,
  catalog,
  onLaunch,
}: {
  readonly progress: OsProgress
  readonly learner: LearnerSnapshot
  readonly catalog: MissionCatalogRepository
  readonly onLaunch: (mission: MissionDefinition) => void
}) {
  const recommendation = recommendMission(progress, catalog)
  const mission =
    recommendation.kind === 'resume' || recommendation.kind === 'start'
      ? catalog.get(recommendation.trackId, recommendation.missionId)
      : catalog.listLaunchable(progress.activeTrackId ?? 'ai-pratica')[0]
  const status = mission === undefined ? undefined : progress.missionStatusByKey[missionKey(mission.trackId, mission.id)]
  const completedMission = catalog
    .listLaunchable()
    .find((item) => progress.missionStatusByKey[missionKey(item.trackId, item.id)] === 'completed')

  return (
    <main className="journey-page hub-page">
      <header className="hub-topbar">
        <div className="journey-brand">
          <span className="journey-cubes" aria-hidden="true"><i /><i /><i /><i /></span>
          <span><strong>AI DevSchool</strong><small>hub de aprendizagem</small></span>
        </div>
        <div className="hub-chips">
          <span>Trilha <strong>{progress.activeTrackId === 'dev' ? 'Dev' : 'IA Prática'}</strong></span>
          <span>Domínio canônico <strong>{learner.masteredCount}</strong></span>
        </div>
      </header>

      <section className="hub-welcome">
        <p className="journey-eyebrow">Seu próximo passo está pronto</p>
        <h1>Aprenda uma coisa útil agora.</h1>
        <p>Uma missão em destaque, com prática observável e progresso que não confunde conclusão com competência.</p>
      </section>

      {completedMission !== undefined ? (
        <section className="honest-progress" aria-label="Estado da missão concluída">
          <div><span>1</span><strong>Atividade concluída</strong><small>Salva neste dispositivo</small></div>
          <div className="current"><span>2</span><strong>Evidência enviada</strong><small>Verificação pendente</small></div>
          <div><span>3</span><strong>Competência verificada</strong><small>Ainda não concedida</small></div>
        </section>
      ) : null}

      <section className="hub-grid">
        <article className="next-mission-card">
          {mission === undefined ? (
            <>
              <p className="journey-eyebrow">Próximo território</p>
              <h2>Nenhuma missão pronta nesta trilha ainda</h2>
              <p>A Trilha Dev será conectada ao mesmo contrato em uma próxima fase. Seu progresso foi preservado.</p>
            </>
          ) : (
            <>
              <p className="journey-eyebrow">
                {status === 'completed' ? 'Missão concluída' : recommendation.kind === 'resume' ? 'Retomar missão' : 'Primeira missão'} · {mission.estimatedMinutes} min
              </p>
              <h2>{mission.title}</h2>
              <p>{mission.objective}</p>
              <ol className="mission-stages">
                <li><span>1</span>Entender</li><li><span>2</span>Responder</li><li><span>3</span>Aplicar</li>
              </ol>
              <button type="button" className="journey-primary" onClick={() => onLaunch(mission)}>
                {status === 'completed' ? 'Praticar novamente' : recommendation.kind === 'resume' ? 'Continuar missão' : 'Começar missão'}
              </button>
            </>
          )}
          <div className="hub-voxels" aria-hidden="true"><i /><i /><i /><i /></div>
        </article>

        <aside className="hub-side">
          <article>
            <p className="journey-eyebrow">Progresso honesto</p>
            <h2>Conclusão não é domínio</h2>
            <p>O jogo e o mentor ajudam a produzir uma tentativa. Só uma verificação independente pode alterar o estado canônico.</p>
            <strong>{learner.masteredCount} competências verificadas</strong>
          </article>
          <article>
            <p className="journey-eyebrow">Ferramentas</p>
            <h2>Desktop legado</h2>
            <p>Janelas, Engine Hub e protótipos continuam disponíveis como ferramentas secundárias.</p>
            <a href="/desktop">Abrir desktop</a>
          </article>
        </aside>
      </section>
    </main>
  )
}
