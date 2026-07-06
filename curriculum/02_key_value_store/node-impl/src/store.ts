import type { EntryView, JsonValue, Pair } from './types';

const DEFAULT_MAX_KEY_BYTES = 512;
const DEFAULT_MAX_VALUE_BYTES = 1 << 20;
const DEFAULT_MAX_KEYS = 100_000;
const DEFAULT_MAX_MEMORY_BYTES = 256 << 20;
const ENTRY_OVERHEAD_BYTES = 64;
const MAX_TTL_SECONDS = 30 * 24 * 60 * 60;
const NANOS_PER_SECOND = 1_000_000_000n;
// MINOR-003 (docs/code_review.md): /health used to run a full O(n) removeExpired()
// sweep on every single call. Monitoring systems poll /health frequently (often
// every few seconds), so this made the cheapest, most-polled endpoint in the
// service the one deliberately made O(n) in the resident key count. Rate-limiting
// the sweep keeps keyCount/expiredKeysRemoved accurate to within this window
// (lazy per-key cleanup on get/delete/etc. already guarantees expired keys are
// never returned to clients in between sweeps — see RF-011) while making repeat
// /health polls within the window O(1).
const HEALTH_SWEEP_MIN_INTERVAL_NANOS = 1_000_000_000n; // 1s

export enum ErrorCode {
  InvalidCommand = 'INVALID_COMMAND',
  InvalidJson = 'INVALID_JSON',
  InvalidKey = 'INVALID_KEY',
  KeyTooLong = 'KEY_TOO_LONG',
  InvalidTtl = 'INVALID_TTL',
  InvalidLimit = 'INVALID_LIMIT',
  KeyNotFound = 'KEY_NOT_FOUND',
  ValueTooLarge = 'VALUE_TOO_LARGE',
  StoreFull = 'STORE_FULL',
  MemoryLimitExceeded = 'MEMORY_LIMIT_EXCEEDED'
}

export class DomainError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export interface StoreConfig {
  maxKeyBytes?: number;
  maxValueBytes?: number;
  maxKeys?: number;
  maxMemoryBytes?: number;
}

interface RequiredStoreConfig {
  maxKeyBytes: number;
  maxValueBytes: number;
  maxKeys: number;
  maxMemoryBytes: number;
}

interface StoredEntry {
  value: JsonValue;
  createdAtNanos: bigint;
  updatedAtNanos: bigint;
  expiresAtNanos: bigint | null;
  expiresAtDate: Date | null;
  approxBytes: number;
}

interface WritePlan {
  expiresAtNanos: bigint | null;
  expiresAtDate: Date | null;
  approxBytes: number;
}

export class KeyValueStore {
  private readonly entries = new Map<string, StoredEntry>();
  private readonly config: RequiredStoreConfig;
  private approxMemoryBytes = 0;
  private commandsProcessed = 0;
  private expiredKeysRemoved = 0;
  private lastHealthSweepNanos: bigint | null = null;

  constructor(config: StoreConfig = {}, private readonly nowNanos: () => bigint = process.hrtime.bigint) {
    this.config = {
      maxKeyBytes: config.maxKeyBytes ?? DEFAULT_MAX_KEY_BYTES,
      maxValueBytes: config.maxValueBytes ?? DEFAULT_MAX_VALUE_BYTES,
      maxKeys: config.maxKeys ?? DEFAULT_MAX_KEYS,
      maxMemoryBytes: config.maxMemoryBytes ?? DEFAULT_MAX_MEMORY_BYTES
    };
  }

  set(key: string, value: JsonValue, ttlSeconds?: number): { key: string; stored: true; expiresAt?: string } {
    this.commandsProcessed += 1;
    this.removeExpired(this.nowNanos());
    const plan = this.validateWrite(key, value, ttlSeconds);
    const now = this.nowNanos();
    const existing = this.entries.get(key);
    this.approxMemoryBytes += plan.approxBytes - (existing?.approxBytes ?? 0);
    this.entries.set(key, {
      value: cloneJson(value),
      createdAtNanos: existing?.createdAtNanos ?? now,
      updatedAtNanos: now,
      expiresAtNanos: plan.expiresAtNanos,
      expiresAtDate: plan.expiresAtDate,
      approxBytes: plan.approxBytes
    });
    return plan.expiresAtDate === null
      ? { key, stored: true }
      : { key, stored: true, expiresAt: plan.expiresAtDate.toISOString() };
  }

  get(key: string): EntryView | null {
    this.commandsProcessed += 1;
    const now = this.nowNanos();
    if (!this.validStoredKey(key, now)) {
      return null;
    }
    const entry = this.entries.get(key);
    return entry === undefined ? null : this.view(key, entry, now);
  }

  delete(keys: readonly string[]): { deleted: number } {
    this.commandsProcessed += 1;
    const now = this.nowNanos();
    let deleted = 0;
    for (const key of keys) {
      if (this.validStoredKey(key, now)) {
        this.removeKey(key);
        deleted += 1;
      }
    }
    return { deleted };
  }

  expire(key: string, ttlSeconds: number): { updated: boolean; ttlSeconds: number; expiresAt: string } {
    this.validateKey(key);
    validateTtl(ttlSeconds);
    this.commandsProcessed += 1;
    const now = this.nowNanos();
    if (!this.validStoredKey(key, now)) {
      throw new DomainError(ErrorCode.KeyNotFound, 'key not found');
    }
    const entry = this.entries.get(key);
    if (entry === undefined) {
      throw new DomainError(ErrorCode.KeyNotFound, 'key not found');
    }
    const expiresAtNanos = now + BigInt(ttlSeconds) * NANOS_PER_SECOND;
    const expiresAtDate = new Date(Date.now() + ttlSeconds * 1000);
    entry.expiresAtNanos = expiresAtNanos;
    entry.expiresAtDate = expiresAtDate;
    entry.updatedAtNanos = now;
    return { updated: true, ttlSeconds, expiresAt: expiresAtDate.toISOString() };
  }

  ttl(key: string): { ttlSeconds: number } {
    this.commandsProcessed += 1;
    const now = this.nowNanos();
    if (!this.validStoredKey(key, now)) {
      return { ttlSeconds: -2 };
    }
    const entry = this.entries.get(key);
    if (entry?.expiresAtNanos === null || entry === undefined) {
      return { ttlSeconds: -1 };
    }
    return { ttlSeconds: remainingSeconds(entry.expiresAtNanos, now) };
  }

  persist(key: string): { updated: boolean } {
    this.commandsProcessed += 1;
    const now = this.nowNanos();
    if (!this.validStoredKey(key, now)) {
      throw new DomainError(ErrorCode.KeyNotFound, 'key not found');
    }
    const entry = this.entries.get(key);
    if (entry === undefined) {
      throw new DomainError(ErrorCode.KeyNotFound, 'key not found');
    }
    const updated = entry.expiresAtNanos !== null;
    entry.expiresAtNanos = null;
    entry.expiresAtDate = null;
    entry.updatedAtNanos = now;
    return { updated };
  }

  keys(prefix = '', limit = 1000): { keys: string[]; count: number } {
    this.commandsProcessed += 1;
    this.removeExpired(this.nowNanos());
    const keys = [...this.entries.keys()].filter((key) => key.startsWith(prefix)).sort().slice(0, limit);
    return { keys, count: keys.length };
  }

  mget(keys: readonly string[]): { items: Array<{ key: string; value: JsonValue | null; found: boolean }> } {
    this.commandsProcessed += 1;
    const now = this.nowNanos();
    const items = keys.map((key) => {
      if (!this.validStoredKey(key, now)) {
        return { key, value: null, found: false };
      }
      const entry = this.entries.get(key);
      return { key, value: entry === undefined ? null : cloneJson(entry.value), found: entry !== undefined };
    });
    return { items };
  }

  mset(items: readonly Pair[], ttlSeconds?: number): { stored: number; expiresAt?: string } {
    this.commandsProcessed += 1;
    this.removeExpired(this.nowNanos());
    const seen = new Set<string>();
    const plans: WritePlan[] = [];
    let newKeyCount = this.entries.size;
    let newMemory = this.approxMemoryBytes;
    for (const item of items) {
      if (seen.has(item.key)) {
        throw new DomainError(ErrorCode.InvalidKey, 'duplicate key in mset');
      }
      seen.add(item.key);
      const plan = this.validateWrite(item.key, item.value, ttlSeconds);
      if (!this.entries.has(item.key)) {
        newKeyCount += 1;
      }
      newMemory += plan.approxBytes - (this.entries.get(item.key)?.approxBytes ?? 0);
      plans.push(plan);
    }
    if (newKeyCount > this.config.maxKeys) {
      throw new DomainError(ErrorCode.StoreFull, 'store key limit exceeded');
    }
    if (newMemory > this.config.maxMemoryBytes) {
      throw new DomainError(ErrorCode.MemoryLimitExceeded, 'memory limit exceeded');
    }
    const now = this.nowNanos();
    items.forEach((item, index) => {
      const existing = this.entries.get(item.key);
      const plan = plans[index];
      if (plan === undefined) {
        return;
      }
      this.entries.set(item.key, {
        value: cloneJson(item.value),
        createdAtNanos: existing?.createdAtNanos ?? now,
        updatedAtNanos: now,
        expiresAtNanos: plan.expiresAtNanos,
        expiresAtDate: plan.expiresAtDate,
        approxBytes: plan.approxBytes
      });
    });
    this.approxMemoryBytes = newMemory;
    const expiresAt = plans.find((plan) => plan.expiresAtDate !== null)?.expiresAtDate?.toISOString();
    return expiresAt === undefined ? { stored: items.length } : { stored: items.length, expiresAt };
  }

  flushdb(): { deleted: number } {
    this.commandsProcessed += 1;
    const deleted = this.entries.size;
    this.entries.clear();
    this.approxMemoryBytes = 0;
    return { deleted };
  }

  health(): { status: 'ok'; keyCount: number; approxMemoryBytes: number; commandsProcessed: number; expiredKeysRemoved: number } {
    const now = this.nowNanos();
    if (this.lastHealthSweepNanos === null || now - this.lastHealthSweepNanos >= HEALTH_SWEEP_MIN_INTERVAL_NANOS) {
      this.removeExpired(now);
      this.lastHealthSweepNanos = now;
    }
    return {
      status: 'ok',
      keyCount: this.entries.size,
      approxMemoryBytes: this.approxMemoryBytes,
      commandsProcessed: this.commandsProcessed,
      expiredKeysRemoved: this.expiredKeysRemoved
    };
  }

  validateKey(key: string): void {
    if (key.length === 0) {
      throw new DomainError(ErrorCode.InvalidKey, 'key must be non-empty');
    }
    if (Buffer.byteLength(key, 'utf8') > this.config.maxKeyBytes) {
      throw new DomainError(ErrorCode.KeyTooLong, 'key is too long');
    }
  }

  private validateWrite(key: string, value: JsonValue, ttlSeconds?: number): WritePlan {
    this.validateKey(key);
    if (ttlSeconds !== undefined) {
      validateTtl(ttlSeconds);
    }
    const serialized = JSON.stringify(value);
    const serializedBytes = Buffer.byteLength(serialized, 'utf8');
    if (serializedBytes > this.config.maxValueBytes) {
      throw new DomainError(ErrorCode.ValueTooLarge, 'value is too large');
    }
    if (!this.entries.has(key) && this.entries.size >= this.config.maxKeys) {
      throw new DomainError(ErrorCode.StoreFull, 'store key limit exceeded');
    }
    const approxBytes = Buffer.byteLength(key, 'utf8') + serializedBytes + ENTRY_OVERHEAD_BYTES;
    const oldBytes = this.entries.get(key)?.approxBytes ?? 0;
    if (this.approxMemoryBytes + approxBytes - oldBytes > this.config.maxMemoryBytes) {
      throw new DomainError(ErrorCode.MemoryLimitExceeded, 'memory limit exceeded');
    }
    if (ttlSeconds === undefined) {
      return { approxBytes, expiresAtNanos: null, expiresAtDate: null };
    }
    return {
      approxBytes,
      expiresAtNanos: this.nowNanos() + BigInt(ttlSeconds) * NANOS_PER_SECOND,
      expiresAtDate: new Date(Date.now() + ttlSeconds * 1000)
    };
  }

  private validStoredKey(key: string, now: bigint): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return false;
    }
    if (entry.expiresAtNanos !== null && entry.expiresAtNanos <= now) {
      this.removeKey(key);
      this.expiredKeysRemoved += 1;
      return false;
    }
    return true;
  }

  private removeExpired(now: bigint): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAtNanos !== null && entry.expiresAtNanos <= now) {
        this.removeKey(key);
        this.expiredKeysRemoved += 1;
      }
    }
  }

  private removeKey(key: string): void {
    const entry = this.entries.get(key);
    if (entry !== undefined) {
      this.approxMemoryBytes = Math.max(0, this.approxMemoryBytes - entry.approxBytes);
      this.entries.delete(key);
    }
  }

  private view(key: string, entry: StoredEntry, now: bigint): EntryView {
    return {
      key,
      value: cloneJson(entry.value),
      ttlSeconds: entry.expiresAtNanos === null ? null : remainingSeconds(entry.expiresAtNanos, now),
      expiresAt: entry.expiresAtDate?.toISOString() ?? null
    };
  }
}

function validateTtl(ttlSeconds: number): void {
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > MAX_TTL_SECONDS) {
    throw new DomainError(ErrorCode.InvalidTtl, 'ttlSeconds must be between 1 and 2592000');
  }
}

function remainingSeconds(expiresAt: bigint, now: bigint): number {
  const remaining = (expiresAt - now) / NANOS_PER_SECOND;
  return Number(remaining < 0n ? 0n : remaining);
}

function cloneJson(value: JsonValue): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
