import { ENGINE_MISSION_EVENT_NAMES, type EngineMissionEventName } from "./protocol";

/**
 * Whitelist de emissão `mission-event` (lado engine). O host valida os nomes
 * no receptor (engines/codexdojo-os-prototype/src/host/validation.ts); esta
 * guarda impede que a engine publique um nome que o host descartaria — a
 * paridade das duas listas é travada por teste em ambos os engines.
 *
 * Fronteira de privacidade (ADR-0009): dimensões são apenas primitivas
 * born-das (string curta, número finito, boolean) — nunca texto livre.
 */

const MISSION_EVENT_NAMES: ReadonlySet<string> = new Set(ENGINE_MISSION_EVENT_NAMES);

export function isEngineMissionEventName(value: unknown): value is EngineMissionEventName {
  return typeof value === "string" && MISSION_EVENT_NAMES.has(value);
}

/** Dimensões aceitas por nome de evento (vocabulário fechado por evento). */
const MISSION_EVENT_DIMENSIONS: Readonly<Record<EngineMissionEventName, readonly string[]>> = {
  "mission.started": ["mode"],
  "mission.completed": ["result"],
  "structured_attempt.submitted": ["activityType"],
  "structured_attempt.passed": ["activityType"],
  "retry.requested": [],
  "review.started": [],
  "mission.brief_viewed": [],
  "activity.presented": ["activityType"],
};

const ACTIVITY_TYPES: readonly string[] = [
  "choice",
  "sort",
  "missing_context",
  "safety_classification",
  "prompt_builder",
  "output_comparison",
  "rubric_review",
];

/**
 * Valida o payload de um `mission-event` antes de postar ao host: nome na
 * whitelist, dimensões exatamente as permitidas do evento (≤8 chaves) e
 * valores primitivos born-das. Espelha a validação do receptor.
 */
export function missionEventPayloadIsValid(input: {
  name: unknown;
  dimensions?: unknown;
}): boolean {
  if (!isEngineMissionEventName(input.name)) return false;
  const dimensions = input.dimensions ?? {};
  if (typeof dimensions !== "object" || dimensions === null || Array.isArray(dimensions)) {
    return false;
  }
  const allowed = MISSION_EVENT_DIMENSIONS[input.name];
  const entries = Object.entries(dimensions as Record<string, unknown>);
  if (entries.length > 8) return false;
  for (const [key, value] of entries) {
    if (!allowed.includes(key)) return false;
    if (typeof value === "string") {
      if (value.length === 0 || value.length > 128) return false;
    } else if (typeof value === "number") {
      if (!Number.isFinite(value)) return false;
    } else if (typeof value !== "boolean") {
      return false;
    }
  }
  if (input.name === "activity.presented") {
    const activityType = (dimensions as Record<string, unknown>).activityType;
    if (typeof activityType !== "string" || !ACTIVITY_TYPES.includes(activityType)) {
      return false;
    }
  }
  return true;
}
