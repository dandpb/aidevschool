import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../server';

function app() {
  return createServer();
}

describe('POST /metrics/:type', () => {
  it('records a counter', async () => {
    const res = await request(app()).post('/metrics/counter').send({ name: 'reqs', value: 1 });
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
  });

  it('records a gauge', async () => {
    const res = await request(app()).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
  });

  it('records a histogram', async () => {
    const res = await request(app()).post('/metrics/histogram').send({ name: 'lat', value: 0.1 });
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
  });

  it('records a timer', async () => {
    const res = await request(app()).post('/metrics/timer').send({ name: 'dur', value: 0.05 });
    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
  });

  it('rejects missing name', async () => {
    const res = await request(app()).post('/metrics/counter').send({ value: 1 });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejects invalid JSON', async () => {
    const res = await request(app()).post('/metrics/counter').send('not json').set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

describe('GET /metrics?query=', () => {
  it('queries aggregated value', async () => {
    const server = app();
    for (let i = 0; i < 5; i++) {
      await request(server).post('/metrics/gauge').send({ name: 'cpu', value: i + 1 });
    }
    const res = await request(server).get('/metrics?query=avg(cpu)');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.value).toBe(3);
  });
});

describe('GET /metrics', () => {
  it('returns prometheus export', async () => {
    const server = app();
    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    const res = await request(server).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('cpu');
  });
});

describe('POST /alerts/rules', () => {
  it('creates an alert rule', async () => {
    const res = await request(app()).post('/alerts/rules').send({
      ruleId: 'rule1',
      name: 'high-cpu',
      enabled: true,
      query: 'avg(cpu)',
      operator: 'gt',
      threshold: 5,
      windowSeconds: 300,
      severity: 'warning',
    });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /alerts/rules', () => {
  it('lists alert rules', async () => {
    const res = await request(app()).get('/alerts/rules');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /dashboard', () => {
  it('returns dashboard', async () => {
    const res = await request(app()).get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /health', () => {
  it('returns health', async () => {
    const res = await request(app()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
