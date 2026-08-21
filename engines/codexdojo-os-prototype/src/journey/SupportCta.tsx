import {
  PILOT_SUPPORT_EMAIL,
  PILOT_SUPPORT_SLA,
  supportMailtoHref,
  supportWhatsAppHref,
} from '../supportContact'

/**
 * Escalation destination for recovery/error screens. WhatsApp is omitted
 * until the shared config slot has a real number.
 */
export function SupportCta({ compact = false }: { compact?: boolean }) {
  const whatsappHref = supportWhatsAppHref()
  return (
    <div className="support-cta" data-testid="support-cta">
      {compact ? null : <p>Precisa de ajuda? O facilitador responde em até {PILOT_SUPPORT_SLA}.</p>}
      <p>
        {whatsappHref ? (
          <>
            <a href={whatsappHref} data-testid="support-whatsapp" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {' · '}
          </>
        ) : null}
        <a href={supportMailtoHref()} data-testid="support-email">
          {PILOT_SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  )
}
