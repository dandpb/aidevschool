import { ConfigError } from './errors';

/** Coerced/validated config that the rest of the app reads. */
export interface AppConfig {
  readonly port: number;
  readonly capacity: number;
  readonly refillRate: number;
  readonly idleTimeoutMs: number;
  readonly cleanupIntervalMs: number;
  readonly trustProxy: boolean;
  readonly logLevel: string;
}

const DEFAULTS: AppConfig = {
  port: 8081,
  capacity: 10,
  refillRate: 2,
  idleTimeoutMs: 60 * 60 * 1000, // 1h per spec
  cleanupIntervalMs: 60 * 1000, // sweep every minute
  trustProxy: false,
  logLevel: 'info',
};

/**
 * Parse `process.env` into a frozen `AppConfig`.
 * ponytail: no zod — env is a handful of numbers/bools.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = parsePositiveInt(env.PORT, DEFAULTS.port, 'PORT');
  const capacity = parsePositiveInt(env.CAPACITY, DEFAULTS.capacity, 'CAPACITY');
  const refillRate = parsePositiveNumber(env.REFILL_RATE, DEFAULTS.refillRate, 'REFILL_RATE');
  const idleTimeoutMs = parsePositiveInt(env.IDLE_TIMEOUT_MS, DEFAULTS.idleTimeoutMs, 'IDLE_TIMEOUT_MS');
  const cleanupIntervalMs = parsePositiveInt(
    env.CLEANUP_INTERVAL_MS,
    DEFAULTS.cleanupIntervalMs,
    'CLEANUP_INTERVAL_MS',
  );
  const trustProxy = parseBoolean(env.TRUST_PROXY, DEFAULTS.trustProxy);
  const logLevel = (env.LOG_LEVEL ?? DEFAULTS.logLevel).toLowerCase();

  return Object.freeze({
    port,
    capacity,
    refillRate,
    idleTimeoutMs,
    cleanupIntervalMs,
    trustProxy,
    logLevel,
  });
}

function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new ConfigError(`${name} must be a positive integer, got ${JSON.stringify(raw)}`);
  }
  return n;
}

function parsePositiveNumber(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ConfigError(`${name} must be a positive number, got ${JSON.stringify(raw)}`);
  }
  return n;
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  const normalized = raw.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new ConfigError(
    `TRUST_PROXY must be a boolean-ish string (true/false), got ${JSON.stringify(raw)}`,
  );
}
