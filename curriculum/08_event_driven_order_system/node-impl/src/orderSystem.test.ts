import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from './server';
import { fold, OrderService } from './orderSystem';

const item = { sku: 'SKU', quantity: 2, unit_price_cents: 500 };

describe('OrderService', () => {
  it('creates orders, publishes outbox records, projects summaries, and is idempotent', () => {
    const service = new OrderService();
    const result = service.createOrder('cust_1', 'create-key', [item]);
    expect(result.status).toBe('pending');
    expect(service.eventsFor(result.order_id)).toHaveLength(1);
    expect(service.summary(result.order_id)?.total_cents).toBe(1000);
    expect(service.health().outbox_backlog).toBe(0);
    const repeated = service.createOrder('cust_1', 'create-key', [item]);
    expect(repeated.order_id).toBe(result.order_id);
    expect(service.eventsFor(result.order_id)).toHaveLength(1);
  });

  it('rejects validation errors, stale versions, and invalid transitions without appending', () => {
    const service = new OrderService();
    expect(() => service.createOrder('cust', 'bad', [])).toThrow(/customer/);
    const result = service.createOrder('cust', 'create', [{ sku: 'S', quantity: 1, unit_price_cents: 1 }]);
    expect(() => service.authorizePayment(result.order_id, 'pay', true, '', 'pay', 0)).toThrow(/expected version/);
    expect(() => service.ship(result.order_id, 'ship', 'ups', 'ship')).toThrow(/transition/);
    expect(service.eventsFor(result.order_id)).toHaveLength(1);
  });

  it('confirms or cancels via saga exactly once', () => {
    const service = new OrderService();
    const ok = service.createOrder('cust', 'create', [{ sku: 'S', quantity: 1, unit_price_cents: 1 }]);
    service.authorizePayment(ok.order_id, 'pay', true, '', 'pay');
    service.reserveInventory(ok.order_id, 'res', true, '', 'res');
    expect(fold(service.eventsFor(ok.order_id)).status).toBe('confirmed');
    service.publishOutbox();
    expect(service.eventsFor(ok.order_id)).toHaveLength(4);

    const failed = service.createOrder('cust', 'create2', [{ sku: 'S', quantity: 1, unit_price_cents: 1 }]);
    service.authorizePayment(failed.order_id, 'pay2', false, 'declined', 'pay-fail');
    expect(fold(service.eventsFor(failed.order_id)).status).toBe('cancelled');
  });

  it('replays projections and reports health', () => {
    const service = new OrderService();
    const result = service.createOrder('cust', 'create', [{ sku: 'S', quantity: 3, unit_price_cents: 7 }]);
    expect(service.replay().events_processed).toBe(1);
    expect(service.summary(result.order_id)?.total_cents).toBe(21);
    expect(service.health().event_store).toBe('ok');
  });
});

describe('HTTP API', () => {
  it('exposes command, event inspection, projection, replay, and health endpoints', async () => {
    const { app } = buildApp();
    const created = await request(app).post('/orders').send({ customer_id: 'cust_http', idempotency_key: 'http-create', items: [{ sku: 'SKU', quantity: 1, unit_price_cents: 12 }] }).expect(201);
    const orderId = created.body.data.order_id;
    await request(app).get(`/orders/${orderId}`).expect(200);
    await request(app).get(`/orders/${orderId}/events`).expect(200);
    await request(app).get('/customers/cust_http/orders').expect(200);
    await request(app).post('/admin/projections/replay').send({ projection: 'all' }).expect(202);
    await request(app).get('/health').expect(200);
  });
});
