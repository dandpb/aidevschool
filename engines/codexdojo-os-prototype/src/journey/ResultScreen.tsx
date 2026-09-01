import type { AchievementId } from '../progress/domain'
import type { EvidenceVerificationState } from '../verification/ports'
import { SupportCta } from './SupportCta'

export type MissionCompletionSummary = {
  readonly xpAwarded: number
  readonly totalXp: number
  readonly achievementsUnlocked: readonly AchievementId[]
}

const ACHIEVEMENT_LABELS: Readonly<Record<AchievementId, string>> = {
  'first-mission': 'Primeira missão',
  'first-practice': 'Primeira prática',
  'ai-pratica-started': 'IA Prática iniciada',
  'dev-started': 'Trilha Dev iniciada',
  'three-missions': 'Três missões concluídas',
  'streak-3': 'Sequência de 3 dias',
  'streak-7': 'Sequência de 7 dias',
}

export function verificationCopy(verification: EvidenceVerificationState): string {
  switch (verification.kind) {
    case 'not-submitted':
      return 'A prática terminou, mas nenhuma evidência foi recebida.'
    case 'validating':
      return 'A evidência está sendo validada fora do progresso local.'
    case 'pending':
      return 'A evidência está preservada e aguarda o verificador independente.'
    case 'gateway-unavailable':
      return 'A evidência está segura. O verificador pode ser tentado novamente.'
    case 'rejected':
      return 'A evidência não passou pelo contrato e precisa de uma nova tentativa.'
    case 'verified':
      return verification.receipt.verdict === 'PASS'
        ? 'O verificador independente aprovou esta evidência. O gate canônico continua separado.'
        : 'O verificador indicou critérios a melhorar. A conclusão local e o XP foram preservados; o gate canônico continua separado.'
  }
}

export function ResultScreen({
  completionStatus,
  summary,
  verification,
  canonicalMasteryCount,
  onRetryVerification,
  onRetrySave,
  onReturn,
}: {
  readonly completionStatus: 'idle' | 'saving' | 'saved' | 'failed'
  readonly summary?: MissionCompletionSummary
  readonly verification: EvidenceVerificationState
  readonly canonicalMasteryCount: number
  readonly onRetryVerification: () => void
  readonly onRetrySave: () => void
  readonly onReturn: () => void
}) {
  const verificationFinished =
    verification.kind === 'verified' ||
    verification.kind === 'rejected' ||
    verification.kind === 'gateway-unavailable'
  const canReturn = completionStatus === 'saved' && verificationFinished
  return (
    <section className="mission-result" aria-labelledby="mission-result-title">
      <p className="journey-eyebrow">Prática concluída neste dispositivo</p>
      <h2 id="mission-result-title">Seu esforço virou um próximo passo claro.</h2>
      <p>
        A recompensa local celebra a prática. Evidência, veredito independente e competência
        canônica continuam registros diferentes.
      </p>
      <p data-testid="completion-is-not-mastery">
        Concluída neste dispositivo não é <code>mastered</code>. O host não fabrica veredito PASS.
      </p>

      <section className="result-rewards" aria-label="Recompensas locais">
        <div>
          <span>XP nesta prática</span>
          <strong>+{summary?.xpAwarded ?? 0} XP</strong>
        </div>
        <div>
          <span>XP total local</span>
          <strong>{summary?.totalXp ?? 0} XP</strong>
        </div>
        <div>
          <span>Competências canônicas</span>
          <strong>{canonicalMasteryCount}</strong>
        </div>
      </section>

      {summary !== undefined && summary.achievementsUnlocked.length > 0 ? (
        <section className="result-achievements" aria-label="Conquistas desbloqueadas">
          <strong>Nova conquista</strong>
          <p>{summary.achievementsUnlocked.map((id) => ACHIEVEMENT_LABELS[id]).join(' · ')}</p>
        </section>
      ) : null}

      <div className="result-verification" aria-live="polite">
        <strong>Resultado da verificação</strong>
        {verification.kind === 'verified' ? (
          <p data-testid="independent-verdict">Veredito {verification.receipt.verdict}</p>
        ) : null}
        <p>{verificationCopy(verification)}</p>
        {verification.kind === 'gateway-unavailable' ? (
          <button type="button" onClick={onRetryVerification}>
            Tentar verificação novamente
          </button>
        ) : null}
      </div>

      {completionStatus === 'failed' ? (
        <div className="result-verification" role="alert">
          <strong>A conclusão local não foi salva.</strong>
          <button type="button" onClick={onRetrySave}>
            Tentar salvar novamente
          </button>
        </div>
      ) : null}

      {verification.kind === 'gateway-unavailable' ||
      verification.kind === 'rejected' ||
      completionStatus === 'failed' ? (
        <SupportCta />
      ) : null}

      <button type="button" className="journey-primary" disabled={!canReturn} onClick={onReturn}>
        {completionStatus === 'saving'
          ? 'Salvando conclusão…'
          : verificationFinished
            ? 'Voltar ao hub'
            : 'Preservando evidência…'}
      </button>
    </section>
  )
}
