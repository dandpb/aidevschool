import { UnmigratableProgressError, migrateProgress } from "./migration";
import type { LearnerProgress, LessonStatus } from "./progress";
import {
  type LearnerStateV1,
  type XpLedgerV1,
  buildCutoverLedger,
  localDateKey,
  validateXpLedger,
} from "./xpLedger";

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
  throw new UnmigratableProgressError("corrupt", `status de lição inválido: ${status}`);
}

export function capProgressToCompleted(progress: LearnerProgress): LearnerProgress {
  const lessonStatus: Record<string, LessonStatus> = {};
  for (const [lessonId, status] of Object.entries(progress.lessonStatus)) {
    lessonStatus[lessonId] = capLessonStatus(status);
  }
  return { ...progress, lessonStatus };
}

/** Serialização legada de registro único — mantida como visão de compatibilidade. */
export function serializeProgressForExport(progress: LearnerProgress): string {
  return `${JSON.stringify(capProgressToCompleted(progress), null, 2)}\n`;
}

/**
 * Parse de registro legado único (schema ≤ 4): migração forward-only + cap.
 * Backup schema-5-in-record (protótipo B) é rejeição tipada — nunca cast.
 */
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
      throw new UnmigratableProgressError("corrupt", "JSON inválido");
    }
  }
  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    const version = (parsed as Record<string, unknown>).schemaVersion;
    if (version === 5) {
      throw new UnmigratableProgressError(
        "prototype-schema-5",
        "backup com schemaVersion 5 (forma do protótipo B) não é um formato suportado",
      );
    }
  }
  return capProgressToCompleted(migrateProgress(parsed, contentVersion, now));
}

// ---------------------------------------------------------------------------
// Envelope v2 (AID-3888): export/import do estado COMPLETO (progresso + ledger)
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = "literacydojo-backup";
export const BACKUP_FORMAT_VERSION = 2;

export type ProgressBackupV2 = {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  progress: LearnerProgress;
  xpLedger: XpLedgerV1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Export do estado autoritativo completo em envelope explícito (forma e
 * versão declaradas — decisão PO `b8f22a28` item 1). Sem timestamp: o par
 * export→import é lossless e comparável com o estado persistido.
 */
export function serializeBackupForExport(state: LearnerStateV1): string {
  const envelope: ProgressBackupV2 = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    progress: capProgressToCompleted(state.progress),
    xpLedger: state.xpLedger,
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

/**
 * Import com rejeição integral antes de persistir (decisão PO `b8f22a28`
 * item 2): valida versão, campos usados, forma do ledger e datas. Aceita
 * envelope v2 completo OU registro legado único schema ≤ 4 (ledger derivado
 * pela semântica de corte). Ledger ausente/null em envelope v2 é ERRO — não
 * autorização para esvaziá-lo. Nenhum reparo parcial nesta fatia.
 */
export function parseImportedBackup(
  raw: unknown,
  contentVersion: string,
  now: Date = new Date(),
): LearnerStateV1 {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new UnmigratableProgressError("corrupt", "JSON inválido");
    }
  }
  if (!isRecord(parsed)) {
    throw new UnmigratableProgressError("corrupt", "backup não é objeto");
  }
  if (parsed.format !== undefined || parsed.formatVersion !== undefined) {
    if (parsed.format !== BACKUP_FORMAT || parsed.formatVersion !== BACKUP_FORMAT_VERSION) {
      throw new UnmigratableProgressError(
        "future-schema",
        `formato de backup desconhecido: ${String(parsed.format)}/${String(parsed.formatVersion)}`,
      );
    }
    if (parsed.xpLedger === null || parsed.xpLedger === undefined) {
      throw new UnmigratableProgressError(
        "corrupt",
        "xpLedger ausente/null em envelope v2 — não é autorização para esvaziá-lo",
      );
    }
    const progress = capProgressToCompleted(migrateProgress(parsed.progress, contentVersion, now));
    const xpLedger = validateXpLedger(parsed.xpLedger);
    return { stateVersion: 1, origin: "import", progress, xpLedger };
  }
  // Registro legado único: semântica de corte (completed semeia marcador
  // permanente; ledger diário nasce vazio — janela única declarada).
  const progress = parseImportedProgress(parsed, contentVersion, now);
  return {
    stateVersion: 1,
    origin: "import",
    progress,
    xpLedger: buildCutoverLedger(progress, localDateKey(now)),
  };
}
