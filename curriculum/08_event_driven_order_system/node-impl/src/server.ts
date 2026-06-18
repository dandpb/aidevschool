import express, { Response } from 'express';
import { DomainError, OrderService } from './orderSystem';

export function buildApp(service = new OrderService()) {
  const app = express();
  app.use(express.json());

  app.post('/orders', (req, res) => respond(res, 201, () => service.createOrder(req.body.customer_id, req.body.idempotency_key, req.body.items ?? [])));
  app.post('/orders/:id/authorize-payment', (req, res) => respond(res, 200, () => service.authorizePayment(req.params.id, req.body.payment_id, req.body.authorized === true, req.body.reason ?? '', req.body.idempotency_key, req.body.expected_version)));
  app.post('/orders/:id/reserve-inventory', (req, res) => respond(res, 200, () => service.reserveInventory(req.params.id, req.body.reservation_id, req.body.reserved === true, req.body.reason ?? '', req.body.idempotency_key, req.body.expected_version)));
  app.post('/orders/:id/cancel', (req, res) => respond(res, 200, () => service.cancel(req.params.id, req.body.reason, req.body.idempotency_key, req.body.expected_version)));
  app.post('/orders/:id/ship', (req, res) => respond(res, 200, () => service.ship(req.params.id, req.body.shipment_id, req.body.carrier, req.body.idempotency_key, req.body.expected_version)));
  app.post('/orders/:id/deliver', (req, res) => respond(res, 200, () => service.deliver(req.params.id, req.body.delivered_at, req.body.idempotency_key, req.body.expected_version)));
  app.get('/orders/:id', (req, res) => {
    const summary = service.summary(req.params.id);
    if (!summary) return writeError(res, 404, 'projection_not_found', 'projection not found');
    return writeOk(res, 200, summary, summary.version);
  });
  app.get('/orders/:id/events', (req, res) => {
    const events = service.eventsFor(req.params.id);
    if (events.length === 0) return writeError(res, 404, 'order_not_found', 'order not found');
    return writeOk(res, 200, { order_id: req.params.id, events }, 0);
  });
  app.get('/customers/:id/orders', (req, res) => writeOk(res, 200, { items: service.history(req.params.id), next_cursor: null }, 0));
  app.post('/admin/projections/replay', (_req, res) => writeOk(res, 202, { replay_id: 'replay_latest', status: 'completed', ...service.replay() }, 0));
  app.get('/health', (_req, res) => writeOk(res, 200, service.health(), 0));
  return { app, service };
}

function respond(res: Response, status: number, action: () => { order_id: string; status: string; event_id: string; version: number }) {
  try {
    const result = action();
    return writeOk(res, status, { order_id: result.order_id, status: result.status, event_id: result.event_id }, result.version);
  } catch (error) {
    if (error instanceof DomainError) return writeError(res, error.status, error.code, error.message);
    return writeError(res, 500, 'internal_error', error instanceof Error ? error.message : 'unknown error');
  }
}

function writeOk(res: Response, status: number, data: unknown, version: number) {
  return res.status(status).json({ ok: true, data, metadata: { correlation_id: 'corr_http', aggregate_version: version } });
}

function writeError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ ok: false, error: { code, message, details: {} }, metadata: { correlation_id: 'corr_http' } });
}

export function shutdown(server: { close: (callback: (err?: Error) => void) => void }): Promise<void> {
  return new Promise((resolve, reject) => server.close((error?: Error) => error ? reject(error) : resolve()));
}
