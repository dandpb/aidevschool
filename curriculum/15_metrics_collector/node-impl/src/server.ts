import express, { Request, Response } from 'express';
import { MetricStore, MetricSample, AlertRule } from './store';

function jsonResponse<T>(res: Response, status: number, data?: T, error?: { code: string; message: string }) {
  res.status(status).json({ ok: !error, data, error });
}

export function createServer(): express.Express {
  const app = express();
  const store = new MetricStore(10000);

  app.use(express.json());

  app.post('/metrics/:type', (req: Request, res: Response) => {
    const { type } = req.params;
    const { name, value, timestamp, labels } = req.body;

    if (!name) {
      return jsonResponse(res, 400, undefined, { code: 'invalid_metric_sample', message: 'name is required' });
    }

    const sample: MetricSample = {
      name,
      type: type as MetricSample['type'],
      value: Number(value),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      labels: labels ?? {},
    };

    store.record(sample);
    jsonResponse(res, 202, { accepted: 1, duplicates: 0, rejected: 0 });
  });

  app.get('/metrics', (req: Request, res: Response) => {
    const query = req.query.query as string;
    if (query) {
      const match = query.match(/^(\w+)\((\w+)\)$/);
      const agg = match ? match[1] : 'sum';
      const name = match ? match[2] : query;
      const start = req.query.start ? new Date(req.query.start as string) : undefined;
      const end = req.query.end ? new Date(req.query.end as string) : undefined;
      const value = store.query(name, 'gauge', {}, start, end, agg);
      jsonResponse(res, 200, { query, value });
    } else {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(store.prometheusExport());
    }
  });

  app.get('/dashboard', (_req: Request, res: Response) => {
    jsonResponse(res, 200, { dashboardId: 'default', panels: [], alerts: [] });
  });

  app.post('/alerts/rules', (req: Request, res: Response) => {
    const rule: AlertRule = req.body;
    store.createAlert(rule);
    jsonResponse(res, 201, { ruleId: rule.ruleId, status: 'enabled' });
  });

  app.get('/alerts/rules', (_req: Request, res: Response) => {
    jsonResponse(res, 200, { items: [] });
  });

  app.get('/health', (_req: Request, res: Response) => {
    jsonResponse(res, 200, { status: 'ok', durabilityMode: 'volatile_until_flush', activeSeries: 0 });
  });

  return app;
}
