import express, { Request, Response } from 'express';
import { LogEntry, LogStore } from './store';

export class Server {
  private store = new LogStore(10000);

  buildApp(): express.Application {
    const app = express();
    app.use(express.json());

    app.post('/logs', (req: Request, res: Response) => {
      const entry = req.body as LogEntry;
      if (!entry.message) {
        return res.status(400).json({ ok: false, error: { code: 'invalid_log_entry', message: 'message is required' } });
      }
      if (!entry.level) {
        return res.status(400).json({ ok: false, error: { code: 'invalid_log_entry', message: 'level is required' } });
      }
      if (!entry.source?.service) {
        return res.status(400).json({ ok: false, error: { code: 'invalid_log_entry', message: 'source.service is required' } });
      }

      this.store.ingest(entry);
      res.status(202).json({ ok: true, data: { accepted: 1, duplicates: 0, rejected: 0 } });
    });

    app.get('/logs', (req: Request, res: Response) => {
      const level = req.query.level as string | undefined;
      const source = req.query.source as string | undefined;
      const correlationId = req.query.correlation_id as string | undefined;
      const traceId = req.query.trace_id as string | undefined;
      const filter = req.query.filter as string | undefined;
      const start = req.query.start as string | undefined;
      const end = req.query.end as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const order = req.query.order as string | undefined;

      const items = this.store.query(level, source, correlationId, traceId, filter, start, end, limit, order === 'desc');
      res.json({
        ok: true,
        data: {
          items,
          next_cursor: null,
          query: { filter: filter || '', level: level || '', correlation_id: correlationId },
          stats: { matched: items.length },
        },
      });
    });

    app.get('/traces/:trace_id', (req: Request, res: Response) => {
      const logs = this.store.getTrace(req.params.trace_id);
      res.json({
        ok: true,
        data: {
          trace: { trace_id: req.params.trace_id, logs },
          partial: false,
        },
      });
    });

    app.get('/health', (_req: Request, res: Response) => {
      res.json({
        ok: true,
        data: {
          status: 'ok',
          durability_mode: 'volatile_until_flush',
          buffer_depth: this.store.count(),
        },
      });
    });

    app.get('/metrics', (_req: Request, res: Response) => {
      res.json({ ok: true, data: { ingested_total: this.store.count() } });
    });

    return app;
  }
}
