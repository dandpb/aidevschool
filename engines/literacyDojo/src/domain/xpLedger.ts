/**
 * Ledger de XP idempotente (AID-3888, contrato `a0bf3e8a` + errata `25b51990`
 * + correções `3b9e7f8a`/`46086ca0`/`e3ad989e`; autorização PO `bdaa0db3`).
 *
 * Contrato de produto (decisão PO `fbfca2a2`/`b8f22a28`):
 * - 10 XP somente na primeira avaliação bem-sucedida por
 *   lessonId/activityId/DIA LOCAL — re-concessão exige data local
 *   ESTRITAMENTE posterior à última premiada daquele alvo.
 * - 25 XP somente na PRIMEIRA conclusão da lição — marcador permanente,
 *   sem repetição por review/replay.
 * - Falha, prática e evidência não consomem elegibilidade.
 * - Proteção de reload declarada NÃO-cheatproof (best-effort local).
 *
 * Este módulo é puro (sem I/O) e não importa valores de outros módulos de
 * domínio — `progress.ts` importa daqui (incluindo `localDateKey`, que passa
 * a viver neste módulo como fonte canônica da data local).
 */
import type { LearnerProgress } from "./progress";

export type LocalDateString = string;

export const LEDGER_VERSION = 1;

/** Ledger diário de avaliação + marcador permanente de primeira conclusão. */
export type XpLedgerV1 = {
  ledgerVersion: 1;
  /** Última data local premiada por alvo de avaliação ("activity:<lessonId>:<activityId>"). */
  lastAwardedDate: Record<string, LocalDateString>;
  /** Primeira conclusão premiada por lição ("lesson:<lessonId>") — permanente. */
  firstCompletionAwarded: Record<string, LocalDateString>;
};

export function emptyXpLedger(): XpLedgerV1 {
  return { ledgerVersion: LEDGER_VERSION, lastAwardedDate: {}, firstCompletionAwarded: {} };
}

export function activityLedgerKey(lessonId: string, activityId: string): string {
  return `activity:${lessonId}:${activityId}`;
}

export function lessonLedgerKey(lessonId: string): string {
  return `lesson:${lessonId}`;
}

/**
 * Data local `YYYY-MM-DD` (mesma semântica histórica de streak/meta diária).
 * Comparação lexicográfica de datas bem-formadas equivale à cronológica.
 */
export function localDateKey(date: Date): LocalDateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Elegível somente se nunca premiado OU se `today` for ESTRITAMENTE
 * posterior à última data premiada (relógio recuado NÃO reconcede).
 */
export function isEligibleForEvaluationAward(
  ledger: XpLedgerV1,
  key: string,
  today: LocalDateString,
): boolean {
  const last = ledger.lastAwardedDate[key];
  return last === undefined || today > last;
}

export function awardEvaluationToLedger(
  ledger: XpLedgerV1,
  key: string,
  today: LocalDateString,
): XpLedgerV1 {
  return { ...ledger, lastAwardedDate: { ...ledger.lastAwardedDate, [key]: today } };
}

export function isFirstCompletionAwarded(ledger: XpLedgerV1, lessonKey: string): boolean {
  return ledger.firstCompletionAwarded[lessonKey] !== undefined;
}

export function markFirstCompletionAwarded(
  ledger: XpLedgerV1,
  lessonKey: string,
  today: LocalDateString,
): XpLedgerV1 {
  return {
    ...ledger,
    firstCompletionAwarded: { ...ledger.firstCompletionAwarded, [lessonKey]: today },
  };
}

/**
 * Snapshot de corte (decisão PO `b8f22a28` item 1): `completed` legado semeia o
 * marcador permanente (impede novo bônus de 25 XP mesmo com ledger diário
 * vazio); o ledger diário nasce vazio (o corte permite a primeira avaliação
 * elegível de 10 XP). NÃO toca em XP total nem em progresso — preserva o
 * existente, sem recalcular/descontar.
 */
export function buildCutoverLedger(
  progress: LearnerProgress,
  cutoverDate: LocalDateString,
): XpLedgerV1 {
  const firstCompletionAwarded: Record<string, LocalDateString> = {};
  for (const [lessonId, status] of Object.entries(progress.lessonStatus)) {
    if (status === "completed") {
      firstCompletionAwarded[lessonLedgerKey(lessonId)] = cutoverDate;
    }
  }
  return { ledgerVersion: LEDGER_VERSION, lastAwardedDate: {}, firstCompletionAwarded };
}

// ---------------------------------------------------------------------------
// Validação total do ledger (import/boot rejeitam integralmente — sem reparo)
// ---------------------------------------------------------------------------

export class XpLedgerInvalidError extends Error {
  constructor(reason: string) {
    super(`Ledger de XP inválido: ${reason}`);
    this.name = "XpLedgerInvalidError";
  }
}

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidLocalDateString(value: unknown): value is LocalDateString {
  if (typeof value !== "string" || !LOCAL_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

const ACTIVITY_KEY_PATTERN = /^activity:[^:]+:[^:]+$/;
const LESSON_KEY_PATTERN = /^lesson:[^:]+$/;

function validateAwardMap(
  raw: unknown,
  label: string,
  keyPattern: RegExp,
): Record<string, LocalDateString> {
  if (raw === null || raw === undefined) {
    throw new XpLedgerInvalidError(`${label} ausente/null — não é autorização para esvaziá-lo`);
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new XpLedgerInvalidError(`${label} não é objeto`);
  }
  const out: Record<string, LocalDateString> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!keyPattern.test(key)) throw new XpLedgerInvalidError(`chave inválida em ${label}: ${key}`);
    if (!isValidLocalDateString(value)) {
      throw new XpLedgerInvalidError(`data inválida em ${label}[${key}]: ${String(value)}`);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Validação total da forma do ledger: versão exata, gramática de chaves,
 * datas locais bem-formadas. Ausência/null é ERRO (decisão PO `b8f22a28`
 * item 2) — nunca autorização para esvaziar.
 */
export function validateXpLedger(raw: unknown): XpLedgerV1 {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new XpLedgerInvalidError("não é objeto");
  }
  const record = raw as Record<string, unknown>;
  if (record.ledgerVersion !== LEDGER_VERSION) {
    throw new XpLedgerInvalidError(
      `ledgerVersion ${String(record.ledgerVersion)} (esperado ${LEDGER_VERSION})`,
    );
  }
  return {
    ledgerVersion: LEDGER_VERSION,
    lastAwardedDate: validateAwardMap(
      record.lastAwardedDate,
      "lastAwardedDate",
      ACTIVITY_KEY_PATTERN,
    ),
    firstCompletionAwarded: validateAwardMap(
      record.firstCompletionAwarded,
      "firstCompletionAwarded",
      LESSON_KEY_PATTERN,
    ),
  };
}

// ---------------------------------------------------------------------------
// Projeção canônica + fingerprint (Precisão 3 de `46086ca0`)
// ---------------------------------------------------------------------------

/**
 * Projeção canônica declarada: serialização determinística (chaves ordem
 * lexicográfica, recursiva) do VALOR lido do port. O fingerprint compara
 * esta projeção — detecção de mudança semântico-estrutural; NÃO afirma
 * igualdade byte a byte do armazenamento.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** Hash FNV-1a (x2 rounds, hex 16 chars) sobre a projeção canônica — detector de mudança, não criptográfico. */
export function fingerprintOf(value: unknown): string {
  const text = canonicalJson(value);
  let h1 = 0xcbf29ce4n;
  let h2 = 0x84222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < text.length; i += 1) {
    const byte = BigInt(text.charCodeAt(i) & 0xff);
    h1 = ((h1 ^ byte) * prime) & mask;
    h2 = ((h2 + byte + BigInt(i)) * prime) & mask;
  }
  return `${h1.toString(16).padStart(16, "0")}${h2.toString(16).padStart(16, "0")}`;
}

// ---------------------------------------------------------------------------
// Estado autoritativo completo, snapshot de corte e intenção de reset
// (namespace próprio — decisões `3b9e7f8a`/`46086ca0`/`e3ad989e`)
// ---------------------------------------------------------------------------

/** Provenance do estado: toda ativação declara sua origem. */
export type LearnerStateOrigin = "cutover" | "fresh-seed" | "reset-seed" | "import";

/**
 * Estado autoritativo COMPLETO da versão nova (progresso + XP + ledger) em
 * namespace próprio (`learner-state-v2`). O ramo legado (`learner-progress`)
 * nunca é escrito por este estado nem é autoritativo sob escritor novo.
 */
export type LearnerStateV1 = {
  stateVersion: 1;
  origin: LearnerStateOrigin;
  progress: LearnerProgress;
  xpLedger: XpLedgerV1;
};

export const LEARNER_STATE_VERSION = 1;

/** Captura fiel do VALOR lido do port (structured clone) — sem promessa de bytes. */
export type LegacyCapture = { legacy: "present"; value: unknown } | { legacy: "confirmed-absent" };

export const ABSENT_FINGERPRINT = "absent";

export type CutoverSnapshotV1 = {
  snapshotVersion: 1;
  createdAt: string;
  contentVersion: string;
  /** Tipo discrimina legado presente × ausência CONFIRMADA pelo port (nunca inferida). */
  legacyCapture: LegacyCapture;
  /** Projeção canônica auditável do valor legado capturado (quando presente). */
  legacyCanonicalJson?: string;
  /** Hash da projeção canônica (ou "absent"). Comparação semântica, não byte a byte. */
  legacyFingerprint: string;
  cutoverLedger: XpLedgerV1;
};

export const SNAPSHOT_VERSION = 1;

/** Marker de reset explícito (marker-first) — distingue reset de ativação interrompida. */
export type ResetIntentV1 = {
  intentVersion: 1;
  kind: "explicit-reset";
  performedAt: string;
  /** Fingerprint do snapshot que este reset invalida para retomada (ou "absent"/"none"). */
  supersedesSnapshotFingerprint: string;
};

export const RESET_INTENT_VERSION = 1;

/**
 * Resultado de leitura de UMA chave (Precisão 1 de `46086ca0`): o port nunca
 * colapsa ausência confirmada, valor presente inválido e erro de leitura.
 */
export type KeyRead<T> =
  | { status: "absent" }
  | { status: "present-valid"; value: T }
  | { status: "present-invalid"; value: unknown; reason?: string }
  | { status: "read-error"; error: unknown };
