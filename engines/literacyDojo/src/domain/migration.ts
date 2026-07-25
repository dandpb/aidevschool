import { type LearnerProgress, PROGRESS_SCHEMA_VERSION } from "./progress";

/**
 * Migração forward-only de LearnerProgress (content-contract regra 4):
 * - schemaVersion 1 → 2: adiciona achievements, dailyGoal e applications.
 * - schemaVersion 2 → 3: acrescenta os campos locais do Mapa Inicial.
 * - schemaVersion atual passa direto; versões desconhecidas lançam
 *   UnmigratableProgressError — o chamador decide (no boot do app: descarta e
 *   recomeça do estado inicial, nunca migra parcialmente em silêncio).
 * - contentVersion divergente: progresso de experiência (`completed`) é
 *   mantido, e toda skill já praticada (passes > 0) fica com revisão devida
 *   imediatamente (nextReviewAt = momento da migração) — regra documentada no
 *   README: versão nova de conteúdo pede revisão, não reconclusão.
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

function checkBaseShape(raw: Record<string, unknown>): void {
  if (!isRecord(raw.lessonStatus) || !isRecord(raw.skills) || !isRecord(raw.streak)) {
    throw new UnmigratableProgressError("forma inválida (lessonStatus/skills/streak)");
  }
  if (!isRecord(raw.onboarding) || typeof raw.onboarding.completed !== "boolean") {
    throw new UnmigratableProgressError("forma inválida (onboarding)");
  }
}

function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    schemaVersion: 2,
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    dailyGoal: isRecord(raw.dailyGoal) ? raw.dailyGoal : { date: "", xpEarned: 0 },
    applications: Array.isArray(raw.applications) ? raw.applications : [],
  };
}

function migrateV2toV3(raw: Record<string, unknown>): Record<string, unknown> {
  const lessonStatus = isRecord(raw.lessonStatus) ? raw.lessonStatus : {};
  const onboarding = isRecord(raw.onboarding) ? raw.onboarding : {};
  const hasCompletedLesson = Object.values(lessonStatus).some((status) => status === "completed");
  if (onboarding.completed === true && !hasCompletedLesson) {
    return {
      ...raw,
      schemaVersion: 3,
      currentLessonId: "l02",
      lessonStatus: { ...lessonStatus, l01: "locked", l02: "available" },
    };
  }
  return { ...raw, schemaVersion: 3 };
}

export function migrateProgress(
  raw: unknown,
  contentVersion: string,
  now: Date = new Date(),
): LearnerProgress {
  if (!isRecord(raw)) {
    throw new UnmigratableProgressError("estado salvo não é um objeto");
  }
  const version = raw.schemaVersion;
  if (version !== PROGRESS_SCHEMA_VERSION && version !== 1 && version !== 2) {
    throw new UnmigratableProgressError(
      `schemaVersion ${String(version)} (esperado ${PROGRESS_SCHEMA_VERSION}, 1 ou 2 migrável)`,
    );
  }
  checkBaseShape(raw);

  let record = raw;
  if (version === 1) {
    record = migrateV1toV2(record);
  }
  if (record.schemaVersion === 2) record = migrateV2toV3(record);

  let progress = record as unknown as LearnerProgress;

  if (progress.contentVersion !== contentVersion) {
    // Regra: `completed` é mantido; skills praticadas ficam com revisão devida
    // já (a próxima revisão usa naturalmente a versão nova da lição).
    const iso = now.toISOString();
    const skills = Object.fromEntries(
      Object.entries(progress.skills).map(([skillId, practice]) => [
        skillId,
        practice.passes > 0 ? { ...practice, nextReviewAt: iso } : practice,
      ]),
    );
    progress = { ...progress, contentVersion, skills };
  }
  return progress;
}
