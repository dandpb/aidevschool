import type { ChatConfig } from './types.js';

export const DEFAULT_CONFIG: ChatConfig = {
  heartbeatIntervalMs: 30_000,
  heartbeatTimeoutMs: 10_000,
  roomCapacity: 100,
  messageSizeLimit: 4_096,
  historySize: 50,
  outboundQueueLimit: 256
};

export interface ServerConfig extends ChatConfig {
  port: number;
  host: string;
  logLevel: string;
}

function intFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function loadConfig(): ServerConfig {
  return {
    ...DEFAULT_CONFIG,
    port: intFromEnv('PORT', 8085),
    host: process.env.HOST ?? '0.0.0.0',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    heartbeatIntervalMs: intFromEnv('HEARTBEAT_INTERVAL_MS', DEFAULT_CONFIG.heartbeatIntervalMs),
    heartbeatTimeoutMs: intFromEnv('HEARTBEAT_TIMEOUT_MS', DEFAULT_CONFIG.heartbeatTimeoutMs),
    roomCapacity: intFromEnv('ROOM_CAPACITY', DEFAULT_CONFIG.roomCapacity),
    messageSizeLimit: intFromEnv('MESSAGE_SIZE_LIMIT', DEFAULT_CONFIG.messageSizeLimit),
    historySize: intFromEnv('HISTORY_SIZE', DEFAULT_CONFIG.historySize),
    outboundQueueLimit: intFromEnv('OUTBOUND_QUEUE_LIMIT', DEFAULT_CONFIG.outboundQueueLimit)
  };
}
