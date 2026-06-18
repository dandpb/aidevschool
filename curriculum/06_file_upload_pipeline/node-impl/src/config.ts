import path from 'node:path';
import os from 'node:os';

export interface Config {
  port: number;
  storageDir: string;
  maxUploadBytes: number;
  allowedMimeTypes: Set<string>;
  allowedExtensions: Set<string>;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: parsePositiveInt(env.PORT, 8088),
    storageDir: env.UPLOAD_STORAGE_DIR ?? path.join(os.tmpdir(), 'file-upload-pipeline-node'),
    maxUploadBytes: parsePositiveInt(env.MAX_UPLOAD_BYTES, 1024 * 1024 * 1024),
    allowedMimeTypes: new Set(['text/plain', 'image/png', 'image/jpeg', 'image/gif', 'application/octet-stream']),
    allowedExtensions: new Set(['.txt', '.png', '.jpg', '.jpeg', '.gif', '.bin']),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
