import express, { type NextFunction, type Request, type Response } from 'express';
import pino, { type Logger } from 'pino';
import {
  AnalyticsQueue,
  AppError,
  CreationRateLimiter,
  UrlStore,
  clickEvent,
  maxBatchSizeLimit,
  type ShortenRequest
} from './core';

export interface ServerOptions {
  baseUrl?: string;
  store?: UrlStore;
  logger?: Logger;
  rateLimiter?: CreationRateLimiter;
}

export function buildApp(options: ServerOptions = {}) {
  const app = express();
  const store = options.store ?? new UrlStore();
  const logger = options.logger ?? pino({ level: process.env.LOG_LEVEL ?? 'info' });
  const analytics = new AnalyticsQueue(store);
  const limiter = options.rateLimiter ?? new CreationRateLimiter(60, 60_000);
  const baseUrl = options.baseUrl ?? 'http://localhost:8081';

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/shorten', (req, res, next) => {
    try {
      limiter.allow(clientKey(req));
      const record = store.create(req.body as ShortenRequest, baseUrl);
      logger.info({ code: record.code }, 'short_url_created');
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  });

  app.post('/shorten/batch', (req, res, next) => {
    try {
      limiter.allow(clientKey(req));
      const urls = (req.body as { urls?: ShortenRequest[] }).urls;
      if (!Array.isArray(urls) || urls.length === 0) {
        throw new AppError(400, 'invalid_batch', 'Batch must contain at least one URL.');
      }
      if (urls.length > maxBatchSizeLimit()) {
        throw new AppError(400, 'batch_too_large', 'Batch cannot contain more than 100 URLs.');
      }
      const results = urls.map((item, index) => {
        try {
          const record = store.create(item, baseUrl);
          return { index, status: 201, code: record.code, short_url: record.short_url };
        } catch (error) {
          const appError = normalizeError(error);
          return { index, status: appError.status, error: appError.code };
        }
      });
      res.status(207).json({ results });
    } catch (error) {
      next(error);
    }
  });

  app.get('/urls', (req, res, next) => {
    try {
      const rawLimit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 50;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      res.status(200).json(store.list(rawLimit, cursor));
    } catch (error) {
      next(error);
    }
  });

  app.get('/:code/stats', (req, res, next) => {
    try {
      res.status(200).json(store.stats(req.params.code));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/:code', (req, res, next) => {
    try {
      store.delete(req.params.code);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get('/:code', (req, res, next) => {
    try {
      const record = store.resolve(req.params.code);
      analytics.enqueue(record.code, clickEvent(req.headers, clientKey(req)));
      res.redirect(301, record.original_url);
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const appError = normalizeError(error);
    if (appError.status >= 500) {
      logger.error({ error }, 'request_failed');
    }
    res.status(appError.status).json({ error: { code: appError.code, message: appError.message } });
  });

  return { app, store, analytics, logger };
}

export function clientKey(req: Request): string {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded !== undefined && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError(500, 'storage_error', 'Internal storage error.');
}
