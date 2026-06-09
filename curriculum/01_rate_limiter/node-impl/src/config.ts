import { z } from 'zod';
import { ConfigError } from './errors';

/**
 * Raw env shape — every variable is an optional string so we can produce a
 * single, batched error message via `z.flattenError` rather than failing on
 * the first missing/invalid variable.
 */
const RawEnvSchema = z.object({
  PORT: z.string().optional(),
  CAPACITY: z.string().optional(),
  REFILL_RATE: z.string().optional(),
  IDLE_TIMEOUT_MS: z.string().optional(),
  CLEANUP_INTERVAL_MS: z.string().optional(),
  TRUST_PROXY: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
});

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
 * Parse `process.env` into a frozen `AppConfig`. Throws `ConfigError` on
 * the first batch of problems so the process exits before binding a socket.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = RawEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }

  const raw = parsed.data;

  const port = parsePositiveInt(raw.PORT, DEFAULTS.port, 'PORT');
  const capacity = parsePositiveInt(raw.CAPACITY, DEFAULTS.capacity, 'CAPACITY');
  const refillRate = parsePositiveNumber(
    raw.REFILL_RATE,
    DEFAULTS.refillRate,
    'REFILL_RATE',
  );
  const idleTimeoutMs = parsePositiveInt(
    raw.IDLE_TIMEOUT_MS,
    DEFAULTS.idleTimeoutMs,
    'IDLE_TIMEOUT_MS',
  );
  const cleanupIntervalMs = parsePositiveInt(
    raw.CLEANUP_INTERVAL_MS,
    DEFAULTS.cleanupIntervalMs,
    'CLEANUP_INTERVAL_MS',
  );
  const trustProxy = parseBoolean(raw.TRUST_PROXY, DEFAULTS.trustProxy);
  const logLevel = (raw.LOG_LEVEL ?? DEFAULTS.logLevel).toLowerCase();

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

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  name: string,
): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new ConfigError(`${name} must be a positive integer, got ${JSON.stringify(raw)}`);
  }
  return n;
}

function parsePositiveNumber(
  raw: string | undefined,
  fallback: number,
  name: string,
): number {
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
