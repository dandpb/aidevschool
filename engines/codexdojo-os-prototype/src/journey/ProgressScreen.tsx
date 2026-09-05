import { useServices } from '../app/ServicesProvider'
import type { LearnerSnapshot } from '../domain'
import type { MissionCatalogRepository } from '../missions/catalog'
import { missionHasCanonicalMastery } from '../missions/reviewMapping'
import { dailyXp, missionKey, type OsProgress } from '../progress/domain'
import type { EvidenceVerificationState } from '../verification/ports'
import { useVerificationByMission } from './useVerificationByMission'
import { listStudentRailMissions } from './studentPath'

function evidenceLabel(state: EvidenceVerificationState | undefined): string {
  if (state === undefined || state.kind === 'not-submitted') return 'Sem evidência recebida'
  if (state.kind === 'verified') return state.receipt.verdict === 'PASS' ? 'Veredito PASS' : 'Veredito FAIL'
  if (state.kind === 'rejected') return 'Evidência rejeitada'
  if (state.kind === 'gateway-unavailable') return 'Verificador indisponível'
  return 'Evidência em processamento'
}

export function ProgressScreen({
  progress,
  learner,
  catalog,
  onBack,
}: {
  readonly progress: OsProgress
  readonly learner: LearnerSnapshot
  readonly catalog: MissionCatalogRepository
  readonly onBack: () => void
}) {
  const services = useServices()
  const { availability: verificationAvailability, verificationByKey } = useVerificationByMission(catalog, services.verification)
  const todayXp = dailyXp(progress, services.clock())

  return (
    <main className="journey-page progress-page">
      <header className="progress-header">
        <button type="button" className="journey-back" onClick={onBack}>← Hub</button>
        <div>
          <p className="journey-eyebrow">Progresso com fonte visível</p>
          <h1>Esforço local não substitui competência verificada.</h1>
          <p>Cada coluna mostra quem produz o estado. XP, prática e sequência ficam neste dispositivo; domínio vem apenas da projeção canônica.</p>
        </div>
      </header>
      {verificationAvailability === 'unavailable' ? (
        <p className="journey-eyebrow" role="status">Verificação indisponível no momento. Seu progresso local continua salvo.</p>
      ) : null}

      <section className="progress-summary" aria-label="Resumo de engajamento local">
        <div><span>XP local</span><strong>{progress.xp}</strong><small>Fonte: OS / IndexedDB</small></div>
        <div><span>Meta de hoje</span><strong>{todayXp}/{progress.dailyGoalXp}</strong><small>Fonte: OS / data local</small></div>
        <div><span>Sequência local</span><strong>{progress.localEngagementStreak.current} dias</strong><small>Fonte: práticas locais</small></div>
        <div><span>Competências</span><strong>{learner.masteredCount}</strong><small>Fonte: learner/substrate</small></div>
      </section>

      <section className="progress-explainer" aria-label="Como ler o progresso">
        <article><span>1</span><h2>Atividade concluída</h2><p>Estado local salvo no dispositivo. Pode liberar a próxima missão, mas não certifica domínio.</p></article>
        <article><span>2</span><h2>Prática realizada</h2><p>Marca que uma tentativa aplicou o conceito. Continua sendo um registro de engajamento local.</p></article>
        <article><span>3</span><h2>Evidência preservada</h2><p>Registro bruto do produtor, guardado fora do XP e sem poder de aprovar a si mesmo.</p></article>
        <article><span>4</span><h2>Veredito independente</h2><p>Recibo separado e ligado ao digest da evidência. PASS ainda respeita a elegibilidade do gate.</p></article>
        <article><span>5</span><h2>Competência canônica</h2><p>Somente a projeção de `learner/learning_state.yaml` pode apresentar este estado.</p></article>
      </section>

      <section className="progress-missions" aria-label="Estado por missão">
        <h2>Missões publicadas</h2>
        {listStudentRailMissions(catalog).map((mission) => {
          const key = missionKey(mission.trackId, mission.id)
          const localStatus = progress.missionStatusByKey[key]
          const engagement = progress.missionEngagementByKey[key]
          const verification = verificationByKey[key]
          return (
            <article key={key}>
              <div><small>{mission.trackId === 'dev' ? 'Simulação hospedada' : 'IA Prática'}</small><strong>{mission.title}</strong></div>
              <div><span>Conclusão local</span><strong>{localStatus === 'completed' ? 'Concluída' : localStatus}</strong></div>
              <div><span>Prática</span><strong>{engagement?.practiceCompleted ? 'Realizada' : 'Pendente'}</strong></div>
              <div><span>Verificação</span><strong>{evidenceLabel(verification)}</strong></div>
              <div><span>Canônico</span><strong>{missionHasCanonicalMastery(mission, learner) ? 'Competência verificada' : 'Não verificada'}</strong></div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
