/**
 * Analytics de produto do bounded context AI Literacy (ADR-0009, emenda
 * AID-913 — ativação O1). Fronteira de privacidade (inviolável): nunca texto
 * livre do usuário, nunca dados pessoais, nunca identificadores persistentes,
 * nunca `mastered`. Os eventos formam um vocabulário fechado e as props são
 * primitivas validadas em runtime — construtores fechados por evento garantem
 * que só as props permitidas entram no envelope. Analytics mede progresso de
 * experiência e engajamento, nunca competência.
 *
 * v2 (emenda ADR-0009 via AID-913): todo evento carrega identidade anônima
 * por sessão — `sessionId` EFÊMERO (gerado por page load, só em memória,
 * nunca persistido; a forma pré-autorizada pelo §2 do ADR-0009) — e
 * `eventId` (UUID por evento, para deduplicação na recepção/agregação). A
 * emissão continua atrás da porta `AnalyticsSink`, agora em batches NDJSON
 * same-origin quando um endpoint é configurado (ativação AID-913).
 */

export const ANALYTICS_SCHEMA_VERSION = 2;
export const ANALYTICS_SOURCE = "literacydojo";

/** Guarda-chuva contra vazamento de texto livre: strings de props são curtas. */
const MAX_PROP_STRING_LENGTH = 120;
const MAX_PROP_KEY_LENGTH = 40;
const PROP_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/** `sessionId`/`eventId` são UUIDs anônimos gerados no navegador. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProductAnalyticsEventName =
  | "entry_viewed"
  | "mapa_inicial_done"
  | "route_chosen"
  | "lesson_started"
  | "activity_attempted"
  | "lesson_completed"
  | "review_started"
  | "review_completed"
  | "lesson_brief_viewed"
  | "activity_presented";

/**
 * Rota de entrada da 1ª tela renderizada (F2 R1): retomada pós-reload de
 * lição em andamento ("lesson-resume" — chamado de "deep-link" no relatório
 * da janela 09-06→09-10), home ou onboarding. Prop OPCIONAL de
 * `entry_viewed`: envelopes pré-v4 sem a prop continuam válidos.
 */
export const ENTRY_ROUTES = ["home", "lesson-resume", "onboarding"] as const;
export type EntryRoute = (typeof ENTRY_ROUTES)[number];

export type AnalyticsPropValue = string | number | boolean;

/** Mesmos 7 tipos de atividade do contrato de conteúdo (espelho do coletor). */
export const ANALYTICS_ACTIVITY_TYPES = [
  "choice",
  "sort",
  "missing_context",
  "safety_classification",
  "prompt_builder",
  "output_comparison",
  "rubric_review",
] as const;
export type AnalyticsActivityType = (typeof ANALYTICS_ACTIVITY_TYPES)[number];

export type ProductAnalyticsEvent = {
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  source: typeof ANALYTICS_SOURCE;
  event: ProductAnalyticsEventName;
  eventId: string;
  /** Anônimo e efêmero: por page load, só em memória (emenda AID-913). */
  sessionId: string;
  occurredAt: string;
  contentVersion: string;
  props: Record<string, AnalyticsPropValue>;
};

const EVENT_NAMES: readonly ProductAnalyticsEventName[] = [
  "entry_viewed",
  "mapa_inicial_done",
  "route_chosen",
  "lesson_started",
  "activity_attempted",
  "lesson_completed",
  "review_started",
  "review_completed",
  "lesson_brief_viewed",
  "activity_presented",
];

/**
 * Props permitidas por evento — o conjunto EXATO (fechado). Espelhado 1:1 no
 * coletor same-origin (`dojo-analytics-collector.mjs`); paridade travada por
 * teste (coletor rejeita exatamente o que este validador rejeita).
 */
const EVENT_PROPS: Readonly<Record<ProductAnalyticsEventName, readonly string[]>> = {
  entry_viewed: ["entry"],
  mapa_inicial_done: ["lessonId", "lessonVersion", "score", "durationSeconds"],
  route_chosen: ["route"],
  lesson_started: ["lessonId", "lessonVersion"],
  activity_attempted: ["lessonId", "activityType", "passed"],
  lesson_completed: ["lessonId", "lessonVersion", "score", "durationSeconds"],
  review_started: ["lessonId", "intervalDays", "stage"],
  review_completed: ["lessonId", "score"],
  lesson_brief_viewed: ["lessonId", "lessonVersion"],
  activity_presented: ["lessonId", "activityType", "activityIndex"],
};

/** Props opcionais (presentes ou ausentes; nunca com outro nome). */
const OPTIONAL_PROPS: Readonly<Record<ProductAnalyticsEventName, readonly string[]>> = {
  entry_viewed: ["entry"],
  mapa_inicial_done: ["durationSeconds"],
  route_chosen: [],
  lesson_started: [],
  activity_attempted: [],
  lesson_completed: ["durationSeconds"],
  review_started: [],
  review_completed: [],
  lesson_brief_viewed: [],
  activity_presented: [],
};

const UUID_KEYS: readonly (keyof ProductAnalyticsEvent)[] = ["eventId", "sessionId"];

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
  for (const key of UUID_KEYS) {
    if (typeof record[key] !== "string" || !UUID_PATTERN.test(record[key] as string)) return false;
  }
  if (typeof record.occurredAt !== "string" || Number.isNaN(Date.parse(record.occurredAt))) {
    return false;
  }
  if (typeof record.contentVersion !== "string" || record.contentVersion.length === 0) return false;
  const props = record.props;
  if (typeof props !== "object" || props === null || Array.isArray(props)) return false;
  const eventName = record.event as ProductAnalyticsEventName;
  const required = EVENT_PROPS[eventName].filter((key) => !OPTIONAL_PROPS[eventName].includes(key));
  for (const key of required) {
    if (!(key in props)) return false;
  }
  for (const [key, item] of Object.entries(props)) {
    if (!EVENT_PROPS[eventName].includes(key)) return false;
    if (key.length > MAX_PROP_KEY_LENGTH || !PROP_KEY_PATTERN.test(key)) return false;
    if (typeof item === "string") {
      if (item.length > MAX_PROP_STRING_LENGTH) return false;
    } else if (typeof item === "number") {
      if (!Number.isFinite(item)) return false;
    } else if (typeof item !== "boolean") {
      return false;
    }
  }
  // Vocabulários de valor por evento (paridade com o coletor).
  if (eventName === "activity_attempted") {
    const { activityType, lessonId, passed } = props as Record<string, unknown>;
    if (typeof lessonId !== "string" || lessonId.length === 0) return false;
    if (!ANALYTICS_ACTIVITY_TYPES.includes(activityType as AnalyticsActivityType)) return false;
    if (typeof passed !== "boolean") return false;
  }
  if (
    eventName === "lesson_started" ||
    eventName === "lesson_completed" ||
    eventName === "mapa_inicial_done"
  ) {
    const { lessonId, lessonVersion } = props as Record<string, unknown>;
    if (typeof lessonId !== "string" || lessonId.length === 0) return false;
    if (typeof lessonVersion !== "number" || !Number.isInteger(lessonVersion)) return false;
  }
  if (eventName === "route_chosen") {
    const { route } = props as Record<string, unknown>;
    if (route !== "guided" && route !== "intermediate") return false;
  }
  // entry_viewed: prop OPCIONAL `entry` com vocabulário fechado (F2 R1) —
  // ausência continua válida (envelopes pré-v4 nunca rejeitados).
  if (eventName === "entry_viewed" && "entry" in props) {
    if (!ENTRY_ROUTES.includes(props.entry as EntryRoute)) return false;
  }
  if (eventName === "lesson_brief_viewed") {
    const { lessonId, lessonVersion } = props as Record<string, unknown>;
    if (typeof lessonId !== "string" || lessonId.length === 0) return false;
    if (typeof lessonVersion !== "number" || !Number.isInteger(lessonVersion)) return false;
  }
  if (eventName === "activity_presented") {
    const { lessonId, activityType, activityIndex } = props as Record<string, unknown>;
    if (typeof lessonId !== "string" || lessonId.length === 0) return false;
    if (!ANALYTICS_ACTIVITY_TYPES.includes(activityType as AnalyticsActivityType)) return false;
    if (
      typeof activityIndex !== "number" ||
      !Number.isInteger(activityIndex) ||
      activityIndex < 0
    ) {
      return false;
    }
  }
  return true;
}

function buildEvent(input: {
  event: ProductAnalyticsEventName;
  eventId: string;
  sessionId: string;
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
    eventId: input.eventId,
    sessionId: input.sessionId,
    occurredAt: input.occurredAt,
    contentVersion: input.contentVersion,
    props,
  };
  if (!isValidAnalyticsEvent(event)) {
    throw new Error("ProductAnalyticsEvent inválido — props fora da fronteira de privacidade");
  }
  return event;
}

type IdentityInput = { eventId: string; sessionId: string };
type TimingInput = { occurredAt: string; contentVersion: string };

/** Superfície de entrada (home) exibida — primeiro estágio do funil. */
export function buildEntryViewedEvent(
  identity: IdentityInput,
  timing: TimingInput,
  input: { entry?: EntryRoute } = {},
): ProductAnalyticsEvent {
  return buildEvent({
    event: "entry_viewed",
    ...identity,
    props: { entry: input.entry },
    ...timing,
  });
}

/**
 * Brief da lição visível ao aprendiz (F2 R2, emenda ADR-0009): a intro da
 * lição — o card "Pedido da Vila Lume" — foi renderizada. Exposição
 * observada, nunca leitura; mesma fronteira de privacidade (só metadados
 * estruturados da lição).
 */
export function buildLessonBriefViewedEvent(
  identity: IdentityInput,
  input: { lessonId: string; lessonVersion: number },
  timing: TimingInput,
): ProductAnalyticsEvent {
  return buildEvent({
    event: "lesson_brief_viewed",
    ...identity,
    props: {
      lessonId: input.lessonId,
      lessonVersion: input.lessonVersion,
    },
    ...timing,
  });
}

/**
 * Atividade do índice `activityIndex` tornada visível pela 1ª vez na sessão
 * (F2 R2, emenda ADR-0009). Emissão por (sessão, índice) — re-render/retry/
 * retomada não reemitem índices já apresentados (guarda no player).
 * Exposição, nunca engajamento comprovado.
 */
export function buildActivityPresentedEvent(
  identity: IdentityInput,
  input: { lessonId: string; activityType: AnalyticsActivityType; activityIndex: number },
  timing: TimingInput,
): ProductAnalyticsEvent {
  return buildEvent({
    event: "activity_presented",
    ...identity,
    props: {
      lessonId: input.lessonId,
      activityType: input.activityType,
      activityIndex: input.activityIndex,
    },
    ...timing,
  });
}

/** Lição aberta (início do funil por lição). Somente metadados estruturados. */
export function buildLessonStartedEvent(
  identity: IdentityInput,
  input: { lessonId: string; lessonVersion: number },
  timing: TimingInput,
): ProductAnalyticsEvent {
  return buildEvent({
    event: "lesson_started",
    ...identity,
    props: {
      lessonId: input.lessonId,
      lessonVersion: input.lessonVersion,
    },
    ...timing,
  });
}

/**
 * Tentativa avaliada (atividade submetida, passa ou não). Marca o estágio
 * "tentativa" do funil; tentativas repetidas na mesma lição/sessão são o
 * marcador de retry. A avaliação em si vai para a evidência (canal próprio),
 * nunca para analytics.
 */
export function buildActivityAttemptedEvent(
  identity: IdentityInput,
  input: { lessonId: string; activityType: AnalyticsActivityType; passed: boolean },
  timing: TimingInput,
): ProductAnalyticsEvent {
  return buildEvent({
    event: "activity_attempted",
    ...identity,
    props: {
      lessonId: input.lessonId,
      activityType: input.activityType,
      passed: input.passed,
    },
    ...timing,
  });
}

/**
 * Lição concluída (conclusão do funil). Somente metadados estruturados da
 * lição e do resultado — nunca respostas, nunca texto livre.
 */
export function buildLessonCompletedEvent(
  identity: IdentityInput,
  input: {
    lessonId: string;
    lessonVersion: number;
    /** Média das melhores notas das atividades obrigatórias (0..1) — progresso, não competência. */
    score: number;
    durationSeconds?: number;
  },
  timing: TimingInput,
): ProductAnalyticsEvent {
  return buildEvent({
    event: "lesson_completed",
    ...identity,
    props: {
      lessonId: input.lessonId,
      lessonVersion: input.lessonVersion,
      score: input.score,
      durationSeconds: input.durationSeconds,
    },
    ...timing,
  });
}

/**
 * Medição da revisão espaçada no corredor (spec AID-915 §4.3, emenda
 * ADR-0009): início de uma revisão devida. Props travadas: `lessonId`,
 * `intervalDays` (janela declarada) e `stage` (índice do estágio [1,7,21]).
 * Engajamento, nunca competência. Assinatura v2 (identidade anônima).
 */
export function buildReviewStartedEvent(
  identity: IdentityInput,
  input: { lessonId: string; intervalDays: number; stage: number },
  timing: TimingInput,
): ProductAnalyticsEvent {
  return buildEvent({
    event: "review_started",
    ...identity,
    props: {
      lessonId: input.lessonId,
      intervalDays: input.intervalDays,
      stage: input.stage,
    },
    ...timing,
  });
}

/** Conclusão de uma revisão espaçada (spec AID-915 §4.3): `lessonId` + `score`. */
export function buildReviewCompletedEvent(
  identity: IdentityInput,
  input: { lessonId: string; score: number },
  timing: TimingInput,
): ProductAnalyticsEvent {
  return buildEvent({
    event: "review_completed",
    ...identity,
    props: {
      lessonId: input.lessonId,
      score: input.score,
    },
    ...timing,
  });
}

/** Envelope de batch aceito pelo coletor same-origin (rota do literacy). */
export type ProductAnalyticsBatch = {
  schemaVersion: typeof ANALYTICS_SCHEMA_VERSION;
  source: typeof ANALYTICS_SOURCE;
  events: ProductAnalyticsEvent[];
};

export function buildAnalyticsBatch(events: ProductAnalyticsEvent[]): ProductAnalyticsBatch {
  return { schemaVersion: ANALYTICS_SCHEMA_VERSION, source: ANALYTICS_SOURCE, events };
}

export function isValidAnalyticsBatch(value: unknown): value is ProductAnalyticsBatch {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== ANALYTICS_SCHEMA_VERSION) return false;
  if (record.source !== ANALYTICS_SOURCE) return false;
  if (!Array.isArray(record.events)) return false;
  return record.events.every(isValidAnalyticsEvent);
}
