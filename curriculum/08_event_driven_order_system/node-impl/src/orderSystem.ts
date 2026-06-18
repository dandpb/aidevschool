import { EventEmitter } from 'node:events';

export type EventType = 'OrderCreated' | 'PaymentAuthorized' | 'PaymentFailed' | 'InventoryReserved' | 'InventoryRejected' | 'OrderConfirmed' | 'OrderCancelled' | 'OrderShipped' | 'OrderDelivered';
export type OrderStatus = 'pending' | 'payment_authorized' | 'payment_failed' | 'inventory_reserved' | 'inventory_rejected' | 'confirmed' | 'cancelled' | 'shipped' | 'delivered';

export interface OrderItem { sku: string; quantity: number; unit_price_cents: number }
export interface OrderEvent { event_id: string; aggregate_id: string; aggregate_type: 'Order'; event_type: EventType; sequence: number; global_position: number; schema_version: 1; occurred_at: string; correlation_id: string; causation_id: string | null; idempotency_key: string | null; payload: Record<string, unknown> }
export interface OrderSummary { order_id: string; customer_id: string; status: OrderStatus; total_cents: number; version: number; last_event_id: string; projection_updated_at: string }
export interface CommandResult { order_id: string; status: OrderStatus; event_id: string; version: number }
export interface Aggregate { order_id: string; customer_id: string; status?: OrderStatus; total_cents: number; version: number; payment_ok: boolean; inventory_ok: boolean; compensation: string[] }

interface OutboxRecord { event_id: string; status: 'pending' | 'publishing' | 'published' | 'failed'; attempts: number }
interface IdempotencyEntry { fingerprint: string; result: CommandResult }

export class DomainError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
}

export class OrderService {
  private readonly events: OrderEvent[] = [];
  private readonly byOrder = new Map<string, OrderEvent[]>();
  private readonly outbox: OutboxRecord[] = [];
  private readonly idempotency = new Map<string, IdempotencyEntry>();
  private readonly summaries = new Map<string, OrderSummary>();
  private readonly histories = new Map<string, OrderSummary[]>();
  private readonly applied = new Set<string>();
  private nextId = 0;
  private subscriberFailures = 0;
  readonly bus = new EventEmitter();

  createOrder(customerId: string, key: string, items: OrderItem[]): CommandResult {
    if (!customerId || items.length === 0) throw new DomainError('invalid_order', 'customer and items are required', 400);
    let total = 0;
    for (const item of items) {
      if (!item.sku || item.quantity < 1 || item.unit_price_cents < 0) throw new DomainError('invalid_item', 'invalid item', 400);
      total += item.quantity * item.unit_price_cents;
    }
    const orderId = `ord_${stableId(customerId + key)}`;
    return this.append(orderId, key, undefined, 'OrderCreated', { customer_id: customerId, items, total_cents: total });
  }

  authorizePayment(orderId: string, paymentId: string, authorized: boolean, reason: string, key: string, expected?: number): CommandResult {
    if (!paymentId) throw new DomainError('invalid_payment', 'payment id is required', 400);
    return this.lifecycle(orderId, key, expected, authorized ? 'PaymentAuthorized' : 'PaymentFailed', { payment_id: paymentId, reason });
  }

  reserveInventory(orderId: string, reservationId: string, reserved: boolean, reason: string, key: string, expected?: number): CommandResult {
    if (!reservationId) throw new DomainError('invalid_reservation', 'reservation id is required', 400);
    return this.lifecycle(orderId, key, expected, reserved ? 'InventoryReserved' : 'InventoryRejected', { reservation_id: reservationId, reason });
  }

  cancel(orderId: string, reason: string, key: string, expected?: number): CommandResult {
    if (!reason) throw new DomainError('invalid_reason', 'reason is required', 400);
    return this.lifecycle(orderId, key, expected, 'OrderCancelled', { reason });
  }

  ship(orderId: string, shipmentId: string, carrier: string, key: string, expected?: number): CommandResult {
    if (!shipmentId || !carrier) throw new DomainError('invalid_shipment', 'shipment and carrier are required', 400);
    return this.lifecycle(orderId, key, expected, 'OrderShipped', { shipment_id: shipmentId, carrier });
  }

  deliver(orderId: string, deliveredAt: string, key: string, expected?: number): CommandResult {
    if (!deliveredAt) throw new DomainError('invalid_delivery', 'delivered_at is required', 400);
    return this.lifecycle(orderId, key, expected, 'OrderDelivered', { delivered_at: deliveredAt });
  }

  private lifecycle(orderId: string, key: string, expected: number | undefined, type: EventType, payload: Record<string, unknown>): CommandResult {
    const events = this.eventsFor(orderId);
    if (events.length === 0) throw new DomainError('order_not_found', 'order not found', 404);
    const aggregate = fold(events);
    if (!canApply(aggregate, type)) throw new DomainError('invalid_transition', 'transition is not allowed', 409);
    return this.append(orderId, key, expected, type, payload);
  }

  private append(orderId: string, key: string, expected: number | undefined, type: EventType, payload: Record<string, unknown>): CommandResult {
    if (!key) throw new DomainError('invalid_idempotency_key', 'idempotency key is required', 400);
    const fingerprint = `${orderId}:${type}:${JSON.stringify(payload)}`;
    const previous = this.idempotency.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new DomainError('idempotency_conflict', 'idempotency key reused', 409);
      return previous.result;
    }
    const current = this.byOrder.get(orderId)?.length ?? 0;
    if (expected !== undefined && expected !== current) throw new DomainError('concurrency_conflict', 'expected version does not match current version', 409);
    this.nextId += 1;
    const event: OrderEvent = { event_id: `evt_${this.nextId.toString().padStart(6, '0')}`, aggregate_id: orderId, aggregate_type: 'Order', event_type: type, sequence: current + 1, global_position: this.events.length + 1, schema_version: 1, occurred_at: new Date().toISOString(), correlation_id: `corr_${stableId(key)}`, causation_id: null, idempotency_key: key, payload };
    this.events.push(event);
    this.byOrder.set(orderId, [...(this.byOrder.get(orderId) ?? []), event]);
    this.outbox.push({ event_id: event.event_id, status: 'pending', attempts: 0 });
    const result = { order_id: orderId, status: statusAfter(type), event_id: event.event_id, version: event.sequence };
    this.idempotency.set(key, { fingerprint, result });
    this.publishOutbox();
    return result;
  }

  publishOutbox(): void {
    for (const record of this.outbox.filter((entry) => entry.status === 'pending')) {
      record.status = 'publishing';
      record.attempts += 1;
      const event = this.events.find((candidate) => candidate.event_id === record.event_id);
      if (!event) continue;
      if (!this.bus.emit('orders.events', event)) this.subscriberFailures += 1;
      this.applyProjection(event);
      this.reactSaga(event);
      record.status = 'published';
    }
  }

  private applyProjection(event: OrderEvent): void {
    if (this.applied.has(event.event_id)) return;
    this.applied.add(event.event_id);
    const existing = this.summaries.get(event.aggregate_id);
    const summary: OrderSummary = existing ?? { order_id: event.aggregate_id, customer_id: '', status: 'pending', total_cents: 0, version: 0, last_event_id: '', projection_updated_at: '' };
    if (event.event_type === 'OrderCreated') {
      summary.customer_id = String(event.payload.customer_id);
      summary.total_cents = Number(event.payload.total_cents);
    }
    summary.status = statusAfter(event.event_type);
    summary.version = event.sequence;
    summary.last_event_id = event.event_id;
    summary.projection_updated_at = new Date().toISOString();
    this.summaries.set(event.aggregate_id, { ...summary });
    const history = this.histories.get(summary.customer_id) ?? [];
    const index = history.findIndex((item) => item.order_id === summary.order_id);
    if (index >= 0) history[index] = { ...summary }; else history.push({ ...summary });
    this.histories.set(summary.customer_id, history);
  }

  private reactSaga(event: OrderEvent): void {
    if (!['PaymentAuthorized', 'InventoryReserved', 'PaymentFailed', 'InventoryRejected'].includes(event.event_type)) return;
    const events = this.eventsFor(event.aggregate_id);
    const aggregate = fold(events);
    const has = (type: EventType) => events.some((candidate) => candidate.event_type === type);
    if (aggregate.payment_ok && aggregate.inventory_ok && !has('OrderConfirmed')) {
      this.append(event.aggregate_id, `saga-confirm-${event.aggregate_id}`, undefined, 'OrderConfirmed', { confirmed_by: 'fulfillment_saga' });
    }
    if ((event.event_type === 'PaymentFailed' || event.event_type === 'InventoryRejected') && !has('OrderCancelled')) {
      const compensation = event.event_type === 'InventoryRejected' && has('PaymentAuthorized') ? 'release_payment' : '';
      this.append(event.aggregate_id, `saga-cancel-${event.aggregate_id}`, undefined, 'OrderCancelled', { reason: 'saga_compensation', compensation });
    }
  }

  eventsFor(orderId: string): OrderEvent[] { return [...(this.byOrder.get(orderId) ?? [])].sort((a, b) => a.sequence - b.sequence); }
  allEvents(): OrderEvent[] { return [...this.events]; }
  summary(orderId: string): OrderSummary | undefined { const summary = this.summaries.get(orderId); return summary ? { ...summary } : undefined; }
  history(customerId: string): OrderSummary[] { return [...(this.histories.get(customerId) ?? [])]; }

  replay(): { events_processed: number; duration_ms: number } {
    const started = Date.now();
    this.summaries.clear();
    this.histories.clear();
    this.applied.clear();
    for (const event of this.events) this.applyProjection(event);
    return { events_processed: this.events.length, duration_ms: Date.now() - started };
  }

  health(): Record<string, unknown> {
    return { status: 'ok', event_store: 'ok', outbox_backlog: this.outbox.filter((entry) => entry.status !== 'published').length, projection_lag_events: 0, projection_lag_ms: 0, saga_backlog: 0, subscriber_failures: this.subscriberFailures };
  }
}

export function fold(events: OrderEvent[]): Aggregate {
  const aggregate: Aggregate = { order_id: '', customer_id: '', total_cents: 0, version: 0, payment_ok: false, inventory_ok: false, compensation: [] };
  let last = 0;
  for (const event of events) {
    if (event.sequence !== last + 1) throw new DomainError('event_sequence_gap', 'event sequence gap', 500);
    last = event.sequence;
    aggregate.order_id = event.aggregate_id;
    aggregate.version = event.sequence;
    switch (event.event_type) {
      case 'OrderCreated': aggregate.customer_id = String(event.payload.customer_id); aggregate.total_cents = Number(event.payload.total_cents); aggregate.status = 'pending'; break;
      case 'PaymentAuthorized': aggregate.payment_ok = true; aggregate.status = 'payment_authorized'; break;
      case 'PaymentFailed': aggregate.status = 'payment_failed'; break;
      case 'InventoryReserved': aggregate.inventory_ok = true; aggregate.status = 'inventory_reserved'; break;
      case 'InventoryRejected': aggregate.status = 'inventory_rejected'; break;
      case 'OrderConfirmed': aggregate.status = 'confirmed'; break;
      case 'OrderCancelled': aggregate.status = 'cancelled'; if (typeof event.payload.compensation === 'string' && event.payload.compensation) aggregate.compensation.push(event.payload.compensation); break;
      case 'OrderShipped': aggregate.status = 'shipped'; break;
      case 'OrderDelivered': aggregate.status = 'delivered'; break;
    }
  }
  return aggregate;
}

function canApply(aggregate: Aggregate, type: EventType): boolean {
  if (['PaymentAuthorized', 'PaymentFailed', 'InventoryReserved', 'InventoryRejected'].includes(type)) return !['cancelled', 'shipped', 'delivered'].includes(aggregate.status ?? '');
  if (type === 'OrderCancelled') return !['cancelled', 'delivered'].includes(aggregate.status ?? '');
  if (type === 'OrderShipped') return aggregate.status === 'confirmed';
  if (type === 'OrderDelivered') return aggregate.status === 'shipped';
  return true;
}

function statusAfter(type: EventType): OrderStatus {
  const statuses: Record<EventType, OrderStatus> = { OrderCreated: 'pending', PaymentAuthorized: 'payment_authorized', PaymentFailed: 'payment_failed', InventoryReserved: 'inventory_reserved', InventoryRejected: 'inventory_rejected', OrderConfirmed: 'confirmed', OrderCancelled: 'cancelled', OrderShipped: 'shipped', OrderDelivered: 'delivered' };
  return statuses[type];
}

function stableId(input: string): string {
  let hash = 2166136261;
  for (const char of input) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
