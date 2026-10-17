/**
 * Estado autoritativo completo do aprendiz (AID-3888): validação total e
 * snapshot de corte. Camada fina acima de `xpLedger.ts` (tipos/ledger) e
 * `migration.ts` (validação/migração do registro de progresso schema ≤ 4) —
 * importada por ports/adapters/useCases, nunca o contrário.
 */
import {
  type UnmigratableProgressError,
  type UnmigratableReason,
  migrateProgress,
} from "./migration";
import type { LearnerProgress } from "./progress";
import {
  ABSENT_FINGERPRINT,
  type CutoverSnapshotV1,
  type KeyRead,
  LEARNER_STATE_VERSION,
  LEDGER_VERSION,
  type LearnerStateOrigin,
  type LearnerStateV1,
  type LegacyCapture,
  RESET_INTENT_VERSION,
  type ResetIntentV1,
  SNAPSHOT_VERSION,
  type XpLedgerV1,
  buildCutoverLedger,
  canonicalJson,
  fingerprintOf,
  localDateKey,
  validateXpLedger,
} from "./xpLedger";

export class LearnerStateInvalidError extends Error {
  constructor(
    public readonly reason: "corrupt" | "future-state" | "future-snapshot" | "future-intent",
    message: string,
  ) {
    super(`Estado do aprendiz inválido: ${message}`);
    this.name = "LearnerStateInvalidError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validação total do `LearnerStateV1` (schema futuro → invalid, sem cast
 * silencioso). O progresso interno passa por `migrateProgress` (valida a
 * forma, migra schemas ≤ 4 e aplica a política de contentVersion) — falha
 * propagada com seu reason original.
 */
export function validateLearnerState(
  raw: unknown,
  contentVersion: string,
  now: Date = new Date(),
): LearnerStateV1 {
  if (!isRecord(raw)) throw new LearnerStateInvalidError("corrupt", "não é objeto");
  if (raw.stateVersion !== LEARNER_STATE_VERSION) {
    throw new LearnerStateInvalidError(
      "future-state",
      `stateVersion ${String(raw.stateVersion)} (esperado ${LEARNER_STATE_VERSION})`,
    );
  }
  const origins: readonly LearnerStateOrigin[] = ["cutover", "fresh-seed", "reset-seed", "import"];
  if (!origins.includes(raw.origin as LearnerStateOrigin)) {
    throw new LearnerStateInvalidError("corrupt", `origin inválida: ${String(raw.origin)}`);
  }
  const progress: LearnerProgress = migrateProgress(raw.progress, contentVersion, now);
  let xpLedger: XpLedgerV1;
  try {
    xpLedger = validateXpLedger(raw.xpLedger);
  } catch (error) {
    throw new LearnerStateInvalidError("corrupt", (error as Error).message);
  }
  return {
    stateVersion: LEARNER_STATE_VERSION,
    origin: raw.origin as LearnerStateOrigin,
    progress,
    xpLedger,
  };
}

/**
 * Snapshot de corte: cópia fiel do VALOR legado lido do port (structured
 * clone), projeção canônica auditável + fingerprint (comparação semântica —
 * sem promessa byte a byte) e ledger de corte. `legacyCapture` discriminado:
 * "confirmed-absent" SOMENTE com ausência confirmada pelo port.
 */
export function buildCutoverSnapshot(input: {
  legacyCapture: LegacyCapture;
  contentVersion: string;
  now: Date;
}): CutoverSnapshotV1 {
  const { legacyCapture } = input;
  const base: Pick<CutoverSnapshotV1, "snapshotVersion" | "createdAt" | "contentVersion"> = {
    snapshotVersion: SNAPSHOT_VERSION,
    createdAt: input.now.toISOString(),
    contentVersion: input.contentVersion,
  };
  if (legacyCapture.legacy === "confirmed-absent") {
    return {
      ...base,
      legacyCapture,
      legacyFingerprint: ABSENT_FINGERPRINT,
      cutoverLedger: {
        ledgerVersion: LEDGER_VERSION,
        lastAwardedDate: {},
        firstCompletionAwarded: {},
      },
    };
  }
  const legacyProgress = migrateProgress(legacyCapture.value, input.contentVersion, input.now);
  return {
    ...base,
    legacyCapture,
    legacyCanonicalJson: canonicalJson(legacyCapture.value),
    legacyFingerprint: fingerprintOf(legacyCapture.value),
    cutoverLedger: buildCutoverLedger(legacyProgress, localDateKey(input.now)),
  };
}

export function validateCutoverSnapshot(raw: unknown): CutoverSnapshotV1 {
  if (!isRecord(raw)) throw new LearnerStateInvalidError("corrupt", "snapshot não é objeto");
  if (raw.snapshotVersion !== SNAPSHOT_VERSION) {
    throw new LearnerStateInvalidError(
      "future-snapshot",
      `snapshotVersion ${String(raw.snapshotVersion)} (esperado ${SNAPSHOT_VERSION})`,
    );
  }
  if (raw.legacyFingerprint !== ABSENT_FINGERPRINT) {
    if (typeof raw.legacyFingerprint !== "string" || raw.legacyFingerprint.length === 0) {
      throw new LearnerStateInvalidError("corrupt", "legacyFingerprint inválido");
    }
    if (typeof raw.legacyCanonicalJson !== "string") {
      throw new LearnerStateInvalidError(
        "corrupt",
        "legacyCanonicalJson ausente com legado presente",
      );
    }
  }
  let cutoverLedger: XpLedgerV1;
  try {
    cutoverLedger = validateXpLedger(raw.cutoverLedger);
  } catch (error) {
    throw new LearnerStateInvalidError("corrupt", (error as Error).message);
  }
  const capture = raw.legacyCapture;
  if (capture !== undefined && !isRecord(capture)) {
    throw new LearnerStateInvalidError("corrupt", "legacyCapture inválido");
  }
  return { ...(raw as unknown as CutoverSnapshotV1), cutoverLedger };
}

export function validateResetIntent(raw: unknown): ResetIntentV1 {
  if (!isRecord(raw)) throw new LearnerStateInvalidError("corrupt", "reset-intent não é objeto");
  if (raw.intentVersion !== RESET_INTENT_VERSION) {
    throw new LearnerStateInvalidError(
      "future-intent",
      `intentVersion ${String(raw.intentVersion)} (esperado ${RESET_INTENT_VERSION})`,
    );
  }
  if (raw.kind !== "explicit-reset" || typeof raw.supersedesSnapshotFingerprint !== "string") {
    throw new LearnerStateInvalidError("corrupt", "forma de reset-intent inválida");
  }
  return raw as unknown as ResetIntentV1;
}

/**
 * Deriva o estado de ativação a partir do snapshot persistido (retomada de
 * corte interrompido): progresso migrado do valor capturado + ledger do corte.
 */
export function activateStateFromSnapshot(
  snapshot: CutoverSnapshotV1,
  contentVersion: string,
  now: Date = new Date(),
): LearnerStateV1 {
  if (snapshot.legacyCapture.legacy === "confirmed-absent") {
    throw new LearnerStateInvalidError(
      "corrupt",
      "snapshot sem legado não carrega progresso para ativar",
    );
  }
  const progress = migrateProgress(snapshot.legacyCapture.value, contentVersion, now);
  return {
    stateVersion: LEARNER_STATE_VERSION,
    origin: "cutover",
    progress,
    xpLedger: snapshot.cutoverLedger,
  };
}

/** Fingerprint do valor legado AGORA (para detectar divergência pós-interrupção). */
export function legacyFingerprintNow(legacyValue: unknown): string {
  return fingerprintOf(legacyValue);
}

export type { KeyRead };
export type { UnmigratableReason, UnmigratableProgressError };
