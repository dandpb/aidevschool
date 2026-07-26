import { useEffect, useState } from 'react'
import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot, MissionDefinition } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import { recommendMission } from '../missions/recommendation'
import { missionKey, type OsProgress } from '../progress/domain'
import type { EvidenceVerificationState } from '../verification/ports'

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
  const services = useServices()
  const [verification, setVerification] = useState<EvidenceVerificationState>({ kind: 'not-submitted' })
  const recommendation = recommendMission(progress, catalog)
  const mission =
    recommendation.kind === 'resume' || recommendation.kind === 'start'
      ? catalog.get(recommendation.trackId, recommendation.missionId)
      : catalog.listLaunchable(progress.activeTrackId ?? 'ai-pratica')[0]
  const status = mission === undefined ? undefined : progress.missionStatusByKey[missionKey(mission.trackId, mission.id)]
  const completedMission = catalog
    .listLaunchable()
    .find((item) => progress.missionStatusByKey[missionKey(item.trackId, item.id)] === 'completed')

  useEffect(() => {
    if (completedMission === undefined) return
    let active = true
    void services.verification.latest(completedMission).then((state) => {
      if (active) setVerification(state)
    })
    return () => { active = false }
  }, [completedMission, services])

  const independentlyVerified = verification.kind === 'verified'

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
          <div className={verification.kind === 'not-submitted' ? '' : 'current'}><span>2</span><strong>Evidência preservada</strong><small>{verification.kind === 'not-submitted' ? 'Ainda não enviada' : 'Separada do progresso local'}</small></div>
          <div className={independentlyVerified ? 'current' : ''}><span>3</span><strong>Verificação independente</strong><small>{independentlyVerified ? `Veredito ${verification.receipt.verdict}` : verification.kind === 'gateway-unavailable' ? 'Temporariamente indisponível' : 'Aguardando verificador'}</small></div>
          <div><span>4</span><strong>Competência canônica</strong><small>Não alterada por este fluxo</small></div>
          {verification.kind === 'gateway-unavailable' ? (
            <button type="button" onClick={() => void services.verification.retry(completedMission, setVerification)}>Tentar verificação novamente</button>
          ) : null}
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
            <p>O jogo e o mentor ajudam a produzir uma tentativa. A verificação independente é um requisito; este fluxo não altera o estado canônico.</p>
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
