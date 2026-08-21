/**
 * Pilot support contact. WhatsApp is optional: leave empty until the operator
 * publishes a real number. UI must hide WhatsApp when the slot is unset.
 * Do not invent a number, CNPJ, or price here.
 */
export const PILOT_SUPPORT_EMAIL = "daniel@heropa.com";

/** E.164 digits (country code + number, no +). Empty = hidden in the UI. */
export const PILOT_SUPPORT_WHATSAPP = "5511984363878";

/** Informal pilot SLA, communicated in product and guides. */
export const PILOT_SUPPORT_SLA = "1 dia útil";

export function supportMailtoHref(subject = "Suporte do piloto AI DevSchool"): string {
  return `mailto:${PILOT_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** WhatsApp deep link, or null when the number slot is empty. */
export function supportWhatsAppHref(): string | null {
  const digits = PILOT_SUPPORT_WHATSAPP.replace(/\D/g, "");
  if (digits.length === 0) return null;
  return `https://wa.me/${digits}`;
}
