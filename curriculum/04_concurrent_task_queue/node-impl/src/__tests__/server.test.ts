import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildServer } from '../server';
import { ManualClock, TaskQueue } from '../taskQueue';

describe('HTTP API', () => {
  it('creates, reads, cancels tasks and reports stats', async () => {
    const clock = new ManualClock(10_000);
    const queue = new TaskQueue({ workerCount: 0, capacity: 2, maxRetries: 1, baseBackoffMs: 10, jitterMs: 0 }, async () => undefined, clock);
    const app = buildServer(queue);

    await request(app).get('/healthz').expect(200, { status: 'ok' });
    const created = await request(app).post('/tasks').send({ payload: { hello: 'world' }, idempotency_key: 'http-key' }).expect(201);
    const id = created.body.id as string;
    await request(app).get(`/tasks/${id}`).expect(200).expect((res) => expect(res.body.status).toBe('queued'));
    await request(app).delete(`/tasks/${id}`).expect(200).expect((res) => expect(res.body.status).toBe('cancelled'));
    await request(app).get('/stats').expect(200).expect((res) => expect(res.body.cancelled_count).toBe(1));
    await request(app).get('/tasks/missing').expect(404).expect((res) => expect(res.body.error).toBe('task_not_found'));
    await request(app).post('/tasks').send({ nope: true }).expect(400);
  });

  it('maps backpressure to 429', async () => {
    const queue = new TaskQueue({ workerCount: 0, capacity: 1, maxRetries: 0, baseBackoffMs: 1, jitterMs: 0 }, async () => undefined, new ManualClock(20_000));
    const app = buildServer(queue);
    await request(app).post('/tasks').send({ payload: { one: true } }).expect(201);
    await request(app).post('/tasks').send({ payload: { two: true } }).expect(429).expect((res) => expect(res.body.error).toBe('queue_full'));
  });
});
