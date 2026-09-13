import express, { Request, Response } from 'express';
import { MetricStore, MetricSample, MetricType, AlertRule } from './store';

const METRIC_TYPES: MetricType[] = ['counter', 'gauge', 'histogram', 'timer'];

function jsonResponse<T>(res: Response, status: number, data?: T, error?: { code: string; message: string }) {
  res.status(status).json({ ok: !error, data, error });
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

export function createServer(): express.Express {
  const app = express();
  const store = new MetricStore(10000);

  app.use(express.json());

  app.post('/metrics/:type', (req: Request, res: Response) => {
    const { type } = req.params;
    const { name, value, timestamp, labels } = req.body;

    if (!METRIC_TYPES.includes(type as MetricType)) {
      return jsonResponse(res, 400, undefined, {
        code: 'invalid_metric_type',
        message: `type must be one of: ${METRIC_TYPES.join(', ')}`,
      });
    }

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
    jsonResponse(res, 202, { accepted: 1, duplicates: 0, rejected: 0, activeSeries: store.activeSeriesCount() });
  });

  app.get('/metrics', (req: Request, res: Response) => {
    const query = req.query.query as string;
    if (query) {
      const match = query.match(/^(\w+)\((\w+)\)$/);
      const agg = match ? match[1] : 'sum';
      const name = match ? match[2] : query;
      const start = parseDate(req.query.start);
      const end = parseDate(req.query.end);
      const result = store.queryByName(name, {}, start, end, agg);
      jsonResponse(res, 200, { query, matched: result.matched, type: result.type, value: result.value });
    } else {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(store.prometheusExport());
    }
  });

  app.get('/dashboard', (req: Request, res: Response) => {
    const start = parseDate(req.query.start);
    const end = parseDate(req.query.end);
    const wantedRaw = typeof req.query.panels === 'string' ? req.query.panels : '';
    const wanted = new Set(wantedRaw.split(',').map((p) => p.trim()).filter(Boolean));

    const panels = store
      .listSeries()
      .filter((s) => wanted.size === 0 || wanted.has(s.name))
      .map((s) => {
        if (s.type === 'histogram' || s.type === 'timer') {
          const h = store.histogramFor(s.name, s.type, s.labels);
          return {
            panelId: `${s.type}_${s.name}`,
            title: s.name,
            type: s.type,
            labels: s.labels,
            points: [],
            summary: h ? { count: h.count, sum: h.sum } : { count: 0, sum: 0 },
          };
        }
        const points = store.seriesPoints(s.name, s.type, s.labels, start, end);
        const values = points.map((p) => p.value);
        const summary = values.length
          ? {
              last: values[values.length - 1],
              avg: values.reduce((a, b) => a + b, 0) / values.length,
              min: Math.min(...values),
              max: Math.max(...values),
            }
          : { last: null, avg: null, min: null, max: null };
        return { panelId: `${s.type}_${s.name}`, title: s.name, type: s.type, labels: s.labels, points, summary };
      });

    store.evaluateAlerts();
    jsonResponse(res, 200, {
      dashboardId: 'default',
      panels,
      alerts: store.listAlertStates(),
    });
  });

  app.post('/alerts/rules', (req: Request, res: Response) => {
    const rule: AlertRule = req.body;
    store.createAlert(rule);
    jsonResponse(res, 201, { ruleId: rule.ruleId, status: 'enabled' });
  });

  app.get('/alerts/rules', (_req: Request, res: Response) => {
    jsonResponse(res, 200, { items: store.listAlerts() });
  });

  app.get('/alerts/events', (req: Request, res: Response) => {
    const ruleId = typeof req.query.rule_id === 'string' ? req.query.rule_id : undefined;
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 1000));
    jsonResponse(res, 200, { items: store.listAlertEvents(ruleId, limit) });
  });

  app.get('/health', (_req: Request, res: Response) => {
    jsonResponse(res, 200, {
      status: 'ok',
      durabilityMode: 'volatile_until_flush',
      activeSeries: store.activeSeriesCount(),
    });
  });

  return app;
}
