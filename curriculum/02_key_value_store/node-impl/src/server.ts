import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import pino from 'pino';
import { z } from 'zod';
import { DomainError, ErrorCode, KeyValueStore } from './store';
import type { JsonValue, Pair } from './types';

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.null(), z.boolean(), z.number(), z.string(), z.array(jsonValueSchema), z.record(jsonValueSchema)])
);
const setSchema = z.object({ value: jsonValueSchema, ttlSeconds: z.number().int().optional() });
const expireSchema = z.object({ ttlSeconds: z.number().int() });
const mgetSchema = z.object({ keys: z.array(z.string()) });
const pairSchema: z.ZodType<Pair> = z.object({ key: z.string(), value: jsonValueSchema });
const msetSchema = z.object({ items: z.array(pairSchema), ttlSeconds: z.number().int().optional() });

export function buildApp(store = new KeyValueStore(), logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, 'request');
    next();
  });

  app.get('/health', (_req, res) => ok(res, store.health()));

  app.put('/v1/kv/:key', (req, res) => {
    const body = parseBody(setSchema, req.body);
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
    const body = parseBody(expireSchema, req.body);
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
    const body = parseBody(mgetSchema, req.body);
    body.keys.forEach((key) => store.validateKey(key));
    ok(res, store.mget(body.keys));
  });

  app.post('/v1/mset', (req, res) => {
    const body = parseBody(msetSchema, req.body);
    ok(res, store.mset(body.items, body.ttlSeconds));
  });

  app.post('/v1/flushdb', (_req, res) => ok(res, store.flushdb()));

  app.use((_req, _res) => {
    throw new DomainError(ErrorCode.InvalidCommand, 'unsupported route');
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _req: Request, res: Response, _next) => {
    const domainError = toDomainError(error);
    res.status(statusFor(domainError.code)).json({ ok: false, error: { code: domainError.code, message: domainError.message, details: {} } });
  };
  app.use(errorHandler);
  return app;
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new DomainError(ErrorCode.InvalidJson, 'request body must match the API contract');
  }
  return result.data;
}

function ok(res: Response, data: unknown): void {
  res.json({ ok: true, data });
}

function toDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }
  if (error instanceof SyntaxError) {
    return new DomainError(ErrorCode.InvalidJson, 'request body must be valid JSON');
  }
  return new DomainError(ErrorCode.InvalidCommand, 'invalid command');
}

function statusFor(code: ErrorCode): number {
  if (code === ErrorCode.KeyNotFound) {
    return 404;
  }
  if (code === ErrorCode.ValueTooLarge) {
    return 413;
  }
  if (code === ErrorCode.StoreFull || code === ErrorCode.MemoryLimitExceeded) {
    return 507;
  }
  return 400;
}
