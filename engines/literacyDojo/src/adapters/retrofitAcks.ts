import type { RetrofitAcks } from "../domain/retrofitNotice";
import { RETROFIT_ACKS_KEY } from "./storageKeys";

/**
 * Acks locais do aviso de retrofit (spec O3-C1 §3): chave estruturada
 * (lessonId → contentVersion), sem texto livre — respeita storage.policy.
 * Armazenamento é best-effort: falha de localStorage nunca derruba o app.
 */
function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadRetrofitAcks(storage: Storage | null = safeStorage()): RetrofitAcks {
  const raw = storage?.getItem(RETROFIT_ACKS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const acks: RetrofitAcks = {};
    for (const [lessonId, version] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof version === "string") acks[lessonId] = version;
    }
    return acks;
  } catch {
    return {};
  }
}

export function saveRetrofitAck(
  lessonId: string,
  contentVersion: string,
  storage: Storage | null = safeStorage(),
): RetrofitAcks {
  const acks = loadRetrofitAcks(storage);
  acks[lessonId] = contentVersion;
  try {
    storage?.setItem(RETROFIT_ACKS_KEY, JSON.stringify(acks));
  } catch {
    // best-effort: sem ack persistido o aviso pode reaparecer, nunca bloqueia.
  }
  return acks;
}

export function resetRetrofitAcks(storage: Storage | null = safeStorage()): void {
  try {
    storage?.removeItem(RETROFIT_ACKS_KEY);
  } catch {
    // best-effort.
  }
}
