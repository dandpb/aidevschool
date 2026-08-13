/**
 * Analytics de produto do bounded context AI Literacy (ADR-0009).
 *
 * Fronteira de privacidade (inviolável): nunca texto livre do usuário, nunca
 * dados pessoais, nunca identificadores persistentes, nunca `mastered`. Os
 * eventos formam um vocabulário fechado e as props são primitivas validadas
 * em runtime — construtores fechados por evento garantem que só as props
 * permitidas entram no envelope. Analytics mede progresso de experiência e
 * engajamento, nunca competência.
 */

export const ANALYTICS_SCHEMA_VERSION = 1;
export const ANALYTICS_SOURCE = "literacydojo";

/** Guarda-chuva contra vazamento de texto livre: strings de props são curtas. */
const MAX_PROP_STRING_LENGTH = 120;
const MAX_PROP_KEY_LENGTH = 40;
const PROP_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export type ProductAnalyticsEventName =
  | "entry_viewed"
  | "mapa_inicial_done"
  | "route_chosen"
  | "lesson_completed";

export type AnalyticsPropValue = string | number | boolean;

export type ProductAnalyticsEvent = {
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  source: typeof ANALYTICS_SOURCE;
  event: ProductAnalyticsEventName;
  occurredAt: string;
  contentVersion: string;
  props: Record<string, AnalyticsPropValue>;
};

const EVENT_NAMES: readonly ProductAnalyticsEventName[] = [
  "entry_viewed",
  "mapa_inicial_done",
  "route_chosen",
  "lesson_completed",
];

/**
 * Validação estrutural do envelope — usada pelo construtor antes de emitir e
 * por testes que auditam o que sai pela porta. Rejeita qualquer prop que não
 * seja primitiva (objetos/arrays poderiam carregar texto livre), strings
 * longas demais e chaves fora do padrão.
 */
export function isValidAnalyticsEvent(value: unknown): value is ProductAnalyticsEvent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== ANALYTICS_SCHEMA_VERSION) return false;
  if (record.source !== ANALYTICS_SOURCE) return false;
  if (!EVENT_NAMES.includes(record.event as ProductAnalyticsEventName)) return false;
  if (typeof record.occurredAt !== "string" || Number.isNaN(Date.parse(record.occurredAt))) {
    return false;
  }
  if (typeof record.contentVersion !== "string" || record.contentVersion.length === 0) return false;
  const props = record.props;
  if (typeof props !== "object" || props === null || Array.isArray(props)) return false;
  for (const [key, item] of Object.entries(props)) {
    if (key.length > MAX_PROP_KEY_LENGTH || !PROP_KEY_PATTERN.test(key)) return false;
    if (typeof item === "string") {
      if (item.length > MAX_PROP_STRING_LENGTH) return false;
    } else if (typeof item === "number") {
      if (!Number.isFinite(item)) return false;
    } else if (typeof item !== "boolean") {
      return false;
    }
  }
  return true;
}

function buildEvent(input: {
  event: ProductAnalyticsEventName;
  props: Record<string, AnalyticsPropValue | undefined>;
  occurredAt: string;
  contentVersion: string;
}): ProductAnalyticsEvent {
  const props: Record<string, AnalyticsPropValue> = {};
  for (const [key, item] of Object.entries(input.props)) {
    if (item !== undefined) props[key] = item;
  }
  const event: ProductAnalyticsEvent = {
    schemaVersion: ANALYTICS_SCHEMA_VERSION,
    source: ANALYTICS_SOURCE,
    event: input.event,
    occurredAt: input.occurredAt,
    contentVersion: input.contentVersion,
    props,
  };
  if (!isValidAnalyticsEvent(event)) {
    throw new Error("ProductAnalyticsEvent inválido — props fora da fronteira de privacidade");
  }
  return event;
}

/**
 * Evento piloto do ADR-0009: lição concluída. Somente metadados estruturados
 * da lição e do resultado — nunca respostas, nunca texto livre.
 */
export function buildLessonCompletedEvent(input: {
  lessonId: string;
  lessonVersion: number;
  /** Média das melhores notas das atividades obrigatórias (0..1) — progresso, não competência. */
  score: number;
  durationSeconds?: number;
  occurredAt: string;
  contentVersion: string;
}): ProductAnalyticsEvent {
  return buildEvent({
    event: "lesson_completed",
    props: {
      lessonId: input.lessonId,
      lessonVersion: input.lessonVersion,
      score: input.score,
      durationSeconds: input.durationSeconds,
    },
    occurredAt: input.occurredAt,
    contentVersion: input.contentVersion,
  });
}
