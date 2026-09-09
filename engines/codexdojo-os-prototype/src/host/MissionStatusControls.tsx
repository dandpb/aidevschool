import { useRef, useState } from 'react'
import type { MissionDefinition } from '../domain'
import { SupportCta } from '../journey/SupportCta'
import type { RendererFailureReason, RendererPreference } from '../rendering/domain'
import { verificationCopy } from '../journey/ResultScreen'
import type { EvidenceVerificationState } from '../verification/ports'
import type { MissionSessionSnapshot } from './MissionSessionController'

const STAGE_LABELS = { understand: 'Entender', respond: 'Responder', apply: 'Aplicar' } as const

const RENDERER_REASON_LABELS: Readonly<Record<RendererFailureReason, string>> = {
  unsupported: 'WebGL não está disponível neste dispositivo.',
  'creation-failed': 'A visualização 3D não pôde ser iniciada.',
  'context-lost': 'A conexão com a GPU foi interrompida.',
  'restore-failed': 'A visualização 3D não pôde ser restaurada.',
  'load-timeout': 'A visualização 3D demorou além do limite.',
}

function verificationLabel(state: EvidenceVerificationState): string {
  switch (state.kind) {
    case 'not-submitted':
      return 'Ainda não enviada'
    case 'validating':
      return 'Validando evidência'
    case 'pending':
      return 'Aguardando verificador independente'
    case 'gateway-unavailable':
      return 'Verificador indisponível'
    case 'rejected':
      return 'Evidência rejeitada'
    case 'verified':
      return state.receipt.verdict === 'PASS'
        ? 'Veredito PASS'
        : 'Veredito FAIL'
  }
}

type MissionStatusControlsProps = {
  readonly mission: MissionDefinition
  readonly session: MissionSessionSnapshot
  readonly verification: EvidenceVerificationState
  readonly completionStatus: 'idle' | 'saving' | 'saved' | 'failed'
  readonly onRetryRenderer: (preference: RendererPreference) => void
  readonly onRetryVerification: () => Promise<unknown> | undefined
  readonly onRetrySave: () => void
}

export function MissionStatusControls({
  mission,
  session,
  verification,
  completionStatus,
  onRetryRenderer,
  onRetryVerification,
  onRetrySave,
}: MissionStatusControlsProps) {
  // AID-1089/W2 (state contract §2.3, preservação de foco no retry): os botões
  // de retry vivem em seções que desmontam quando o estado muda; o painel de
  // status persiste e recebe foco programático (tabIndex -1).
  const statusRef = useRef<HTMLElement | null>(null)
  const retryThenFocusStatus = (retry: () => void) => {
    retry()
    statusRef.current?.focus()
  }
  // AID-1089/W2 (§2.3-6): busy local durante o voo do retry de verificação
  // (a promise retorna antes do estado terminal chegar via updateVerification).
  const [verificationInFlight, setVerificationInFlight] = useState(false)
  const handleRetryVerification = () => {
    setVerificationInFlight(true)
    statusRef.current?.focus()
    void Promise.resolve(onRetryVerification()).finally(() => setVerificationInFlight(false))
  }
  const verifying = verification.kind === 'validating' || verificationInFlight
  return (
    <>
      <section
        ref={statusRef}
        tabIndex={-1}
        className={`mission-status${mission.runtime.engineId === 'voxelDojo' ? ' with-renderer' : ''}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <span>Etapa</span>
          <strong>{STAGE_LABELS[session.stage]}</strong>
        </div>
        <div>
          <span>Motor</span>
          <strong>{session.phase === 'handshaking' ? 'Conectando' : session.phase}</strong>
        </div>
        {mission.runtime.engineId === 'voxelDojo' ? (
          <div>
            <span>Visualização</span>
            <strong>
              {session.renderer.active === 'webgl'
                ? '3D WebGL'
                : session.renderer.active === 'none'
                  ? session.renderer.status
                  : 'Acessível'}
            </strong>
          </div>
        ) : null}
        <div>
          <span>Evidência</span>
          <strong>{verificationLabel(verification)}</strong>
        </div>
      </section>

      {mission.runtime.engineId === 'voxelDojo' &&
      (session.renderer.status === 'degraded' || session.renderer.status === 'failed') ? (
        <section className="renderer-recovery" role="status">
          <div>
            <strong>Missão preservada em modo acessível</strong>
            <p>
              {session.renderer.reason === undefined
                ? 'A simulação continua sem depender da visualização 3D.'
                : RENDERER_REASON_LABELS[session.renderer.reason]}{' '}
              As decisões, os critérios e a evidência não mudam.
            </p>
          </div>
          <button type="button" onClick={() => retryThenFocusStatus(() => onRetryRenderer('webgl'))}>
            Tentar 3D novamente
          </button>
        </section>
      ) : null}
      {mission.runtime.engineId === 'voxelDojo' && session.renderer.active === 'webgl' ? (
        <section className="renderer-choice">
          <p>{mission.fallback.summary}</p>
          <button type="button" onClick={() => onRetryRenderer('accessible')}>
            Usar visualização acessível
          </button>
        </section>
      ) : null}

      {session.phase !== 'completed' && verification.kind === 'verified' ? (
        <section className="verification-note" aria-live="polite" aria-atomic="true">
          <strong>Veredito independente: {verification.receipt.verdict}</strong>
          <p>{verificationCopy(verification)}</p>
          <p>
            Gate canônico não executado: a tentativa e os requisitos do gate continuam separados
            deste veredito.
          </p>
        </section>
      ) : null}
      {session.phase !== 'completed' && verification.kind === 'gateway-unavailable' ? (
        <section className="verification-note" role="status" aria-atomic="true">
          <p>A evidência foi preservada. O verificador local está indisponível.</p>
          <button
            type="button"
            disabled={verifying}
            aria-busy={verifying}
            onClick={handleRetryVerification}
          >
            Tentar verificação novamente
          </button>
        </section>
      ) : null}
      {session.phase !== 'completed' && verification.kind === 'rejected' ? (
        <p className="mission-error" role="alert">
          Evidência recusada: {verification.code}
        </p>
      ) : null}
      {session.phase !== 'completed' && completionStatus === 'failed' ? (
        <section className="verification-note" role="alert" aria-atomic="true">
          <p>Não foi possível salvar a conclusão local.</p>
          <button type="button" onClick={() => retryThenFocusStatus(onRetrySave)}>
            Tentar salvar novamente
          </button>
        </section>
      ) : null}

      {session.error === undefined ? null : (
        <p className="mission-error" role="alert">
          {session.error}
        </p>
      )}
      {session.phase !== 'completed' &&
      (verification.kind === 'gateway-unavailable' ||
        verification.kind === 'rejected' ||
        completionStatus === 'failed' ||
        session.error !== undefined) ? (
        <SupportCta compact />
      ) : null}
    </>
  )
}
