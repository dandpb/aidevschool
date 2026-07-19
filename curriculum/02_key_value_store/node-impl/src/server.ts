import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { createLogger } from './logger';
import { DomainError, ErrorCode, KeyValueStore } from './store';
import type { JsonValue, Pair } from './types';

function isJsonValue(v: unknown): v is JsonValue {
  if (v === null || typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string') return true;
  if (Array.isArray(v)) return v.every(isJsonValue);
  if (typeof v === 'object') return Object.values(v as object).every(isJsonValue);
  return false;
}

function asObject(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
  }
  return body as Record<string, unknown>;
}

function optionalInt(raw: Record<string, unknown>, key: string): number | undefined {
  if (raw[key] === undefined) return undefined;
  const n = Number(raw[key]);
  if (!Number.isInteger(n)) {
    throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
  }
  return n;
}

function requireInt(raw: Record<string, unknown>, key: string): number {
  const n = optionalInt(raw, key);
  if (n === undefined) {
    throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
  }
  return n;
}

function parseSetBody(body: unknown): { value: JsonValue; ttlSeconds?: number } {
  const raw = asObject(body);
  if (!('value' in raw) || !isJsonValue(raw.value)) {
    throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
  }
  return { value: raw.value, ttlSeconds: optionalInt(raw, 'ttlSeconds') };
}

function parseExpireBody(body: unknown): { ttlSeconds: number } {
  return { ttlSeconds: requireInt(asObject(body), 'ttlSeconds') };
}

function parseMgetBody(body: unknown): { keys: string[] } {
  const raw = asObject(body);
  if (!Array.isArray(raw.keys) || !raw.keys.every((k) => typeof k === 'string')) {
    throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
  }
  return { keys: raw.keys };
}

function parseMsetBody(body: unknown): { items: Pair[]; ttlSeconds?: number } {
  const raw = asObject(body);
  if (!Array.isArray(raw.items)) {
    throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
  }
  const items: Pair[] = [];
  for (const item of raw.items) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as Pair).key !== 'string' ||
      !isJsonValue((item as Pair).value)
    ) {
      throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
    }
    items.push({ key: (item as Pair).key, value: (item as Pair).value });
  }
  return { items, ttlSeconds: optionalInt(raw, 'ttlSeconds') };
}

export function buildApp(store = new KeyValueStore(), logger = createLogger(process.env.LOG_LEVEL ?? 'info')) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, 'request');
    next();
  });

  app.get('/health', (_req, res) => ok(res, store.health()));

  app.put('/v1/kv/:key', (req, res) => {
    const body = parseSetBody(req.body);
    ok(res, store.set(req.params.key, body.value, body.ttlSeconds));
  });

  app.get('/v1/kv/:key', (req, res) => {
    const entry = store.get(req.params.key);
    if (entry === null) {
      throw new DomainError(ErrorCode.KeyNotFound, 'key not found');
    }
    ok(res, entry);
  });

  app.delete('/v1/kv/:key', (req, res) => {
    store.validateKey(req.params.key);
    ok(res, store.delete([req.params.key]));
  });

  app.post('/v1/kv/:key/expire', (req, res) => {
    const body = parseExpireBody(req.body);
    ok(res, store.expire(req.params.key, body.ttlSeconds));
  });

  app.get('/v1/kv/:key/ttl', (req, res) => {
    store.validateKey(req.params.key);
    ok(res, store.ttl(req.params.key));
  });

  app.post('/v1/kv/:key/persist', (req, res) => ok(res, store.persist(req.params.key)));

  app.get('/v1/keys', (req, res) => {
    const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : '';
    const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const limit = limitRaw === undefined ? 1000 : Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 0 || limit > 10_000) {
      throw new DomainError(ErrorCode.InvalidLimit, 'limit must be between 0 and 10000');
    }
    if (Buffer.byteLength(prefix, 'utf8') > 512) {
      throw new DomainError(ErrorCode.KeyTooLong, 'prefix is too long');
    }
    ok(res, store.keys(prefix, limit));
  });

  app.post('/v1/mget', (req, res) => {
    const body = parseMgetBody(req.body);
    body.keys.forEach((key) => store.validateKey(key));
    ok(res, store.mget(body.keys));
  });

  app.post('/v1/mset', (req, res) => {
    const body = parseMsetBody(req.body);
    ok(res, store.mset(body.items, body.ttlSeconds));
  });

  app.post('/v1/flushdb', (_req, res) => ok(res, store.flushdb()));

  app.use((_req, _res) => {
    throw new DomainError(ErrorCode.InvalidCommand, 'unsupported route');
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _req: Request, res: Response, _next) => {
    const domainError = toDomainError(error);
    res
      .status(statusFor(domainError.code))
      .json({ ok: false, error: { code: domainError.code, message: domainError.message, details: {} } });
  };
  app.use(errorHandler);
  return app;
}

function ok(res: Response, data: unknown): void {
  res.json({ ok: true, data });
}

function toDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  if (error instanceof SyntaxError) {
    return new DomainError(ErrorCode.InvalidJson, 'request body must be valid JSON');
  }
  return new DomainError(ErrorCode.InvalidCommand, 'invalid command');
}

function statusFor(code: ErrorCode): number {
  if (code === ErrorCode.KeyNotFound) return 404;
  if (code === ErrorCode.ValueTooLarge) return 413;
  if (code === ErrorCode.StoreFull || code === ErrorCode.MemoryLimitExceeded) return 507;
  return 400;
}
