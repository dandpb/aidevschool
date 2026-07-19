import { type LearnerProgress, PROGRESS_SCHEMA_VERSION } from "./progress";

/**
 * Migração forward-only de LearnerProgress (content-contract regra 4):
 * - schemaVersion atual (1) é aceito; versões diferentes não têm migração
 *   automática e lançam UnmigratableProgressError — o chamador decide
 *   (no boot do app: descarta e recomeça do estado inicial).
 * - contentVersion mais nova não invalida o progresso de experiência:
 *   `completed` permanece válido; apenas registramos a nova versão do conteúdo.
 *   A próxima revisão espaçada usa naturalmente a versão nova da lição.
 * - Mudança de id de lição é proibida pelo contrato — id novo = lição nova,
 *   sem migração.
 */

export class UnmigratableProgressError extends Error {
  constructor(reason: string) {
    super(`Progresso local não migrável: ${reason}`);
    this.name = "UnmigratableProgressError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateProgress(raw: unknown, contentVersion: string): LearnerProgress {
  if (!isRecord(raw)) {
    throw new UnmigratableProgressError("estado salvo não é um objeto");
  }
  if (raw.schemaVersion !== PROGRESS_SCHEMA_VERSION) {
    throw new UnmigratableProgressError(
      `schemaVersion ${String(raw.schemaVersion)} (esperado ${PROGRESS_SCHEMA_VERSION})`,
    );
  }
  if (!isRecord(raw.lessonStatus) || !isRecord(raw.skills) || !isRecord(raw.streak)) {
    throw new UnmigratableProgressError("forma inválida (lessonStatus/skills/streak)");
  }
  if (!isRecord(raw.onboarding) || typeof raw.onboarding.completed !== "boolean") {
    throw new UnmigratableProgressError("forma inválida (onboarding)");
  }

  const progress = raw as unknown as LearnerProgress;
  if (progress.contentVersion !== contentVersion) {
    return { ...progress, contentVersion };
  }
  return progress;
}
