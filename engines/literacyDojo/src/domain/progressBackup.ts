import { UnmigratableProgressError, migrateProgress } from "./migration";
import type { LearnerProgress, LessonStatus } from "./progress";

const PRODUCER_STATUSES: readonly LessonStatus[] = [
  "locked",
  "available",
  "in_progress",
  "completed",
];

/**
 * The producer cap is `completed`. `mastered` is reserved for an independent
 * verifier and must never appear in a LiteracyDojo backup.
 */
export function capLessonStatus(status: string): LessonStatus {
  if (status === "mastered") return "completed";
  if ((PRODUCER_STATUSES as readonly string[]).includes(status)) {
    return status as LessonStatus;
  }
  throw new UnmigratableProgressError(`status de lição inválido: ${status}`);
}

export function capProgressToCompleted(progress: LearnerProgress): LearnerProgress {
  const lessonStatus: Record<string, LessonStatus> = {};
  for (const [lessonId, status] of Object.entries(progress.lessonStatus)) {
    lessonStatus[lessonId] = capLessonStatus(status);
  }
  return { ...progress, lessonStatus };
}

export function serializeProgressForExport(progress: LearnerProgress): string {
  return `${JSON.stringify(capProgressToCompleted(progress), null, 2)}\n`;
}

export function parseImportedProgress(
  raw: unknown,
  contentVersion: string,
  now: Date = new Date(),
): LearnerProgress {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new UnmigratableProgressError("JSON inválido");
    }
  }
  return capProgressToCompleted(migrateProgress(parsed, contentVersion, now));
}
