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

  it('rejects an unknown metric type', async () => {
    const res = await request(app()).post('/metrics/bogus').send({ name: 'x', value: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_metric_type');
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
    expect(res.body.data.matched).toBe(true);
    expect(res.body.data.type).toBe('gauge');
    expect(res.body.data.value).toBe(3);
  });

  it('queries a counter instead of only gauges', async () => {
    const server = app();
    for (let i = 0; i < 3; i++) {
      await request(server).post('/metrics/counter').send({ name: 'reqs', value: 1 });
    }
    const res = await request(server).get('/metrics?query=sum(reqs)');
    expect(res.status).toBe(200);
    expect(res.body.data.matched).toBe(true);
    expect(res.body.data.type).toBe('counter');
    expect(res.body.data.value).toBe(3);
  });

  it('queries histogram percentiles from bucket data', async () => {
    const server = app();
    for (let i = 0; i < 10; i++) {
      await request(server).post('/metrics/histogram').send({ name: 'lat', value: i * 0.1 });
    }
    const res = await request(server).get('/metrics?query=p95(lat)');
    expect(res.status).toBe(200);
    expect(res.body.data.matched).toBe(true);
    expect(res.body.data.type).toBe('histogram');
    expect(res.body.data.value).toBeGreaterThan(0);
  });

  it('queries timer observations from histogram data via sum', async () => {
    const server = app();
    await request(server).post('/metrics/timer').send({ name: 'dur', value: 0.05 });
    await request(server).post('/metrics/timer').send({ name: 'dur', value: 0.2 });
    const res = await request(server).get('/metrics?query=sum(dur)');
    expect(res.status).toBe(200);
    expect(res.body.data.matched).toBe(true);
    expect(res.body.data.type).toBe('timer');
    expect(res.body.data.value).toBeCloseTo(0.25, 5);
  });

  it('reports unmatched for an unknown metric', async () => {
    const res = await request(app()).get('/metrics?query=sum(nope)');
    expect(res.status).toBe(200);
    expect(res.body.data.matched).toBe(false);
    expect(res.body.data.type).toBeNull();
    expect(res.body.data.value).toBeNull();
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
  it('returns empty items only on a fresh store', async () => {
    const res = await request(app()).get('/alerts/rules');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('lists the rules that were created', async () => {
    const server = app();
    await request(server).post('/alerts/rules').send({
      ruleId: 'rule1',
      name: 'high-cpu',
      enabled: true,
      query: 'avg(cpu)',
      operator: 'gt',
      threshold: 5,
      windowSeconds: 300,
      severity: 'warning',
    });
    await request(server).post('/alerts/rules').send({
      ruleId: 'rule2',
      name: 'idle-cpu',
      enabled: false,
      query: 'avg(cpu)',
      operator: 'lt',
      threshold: 1,
      windowSeconds: 300,
      severity: 'info',
    });
    const res = await request(server).get('/alerts/rules');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    const ids = res.body.data.items.map((r: { ruleId: string }) => r.ruleId).sort();
    expect(ids).toEqual(['rule1', 'rule2']);
    const rule1 = res.body.data.items.find((r: { ruleId: string }) => r.ruleId === 'rule1');
    expect(rule1.threshold).toBe(5);
    expect(rule1.enabled).toBe(true);
  });
});

describe('GET /alerts/events', () => {
  it('lists alert events recorded by evaluation', async () => {
    const server = app();
    await request(server).post('/alerts/rules').send({
      ruleId: 'rule1',
      name: 'high-cpu',
      enabled: true,
      query: 'avg(cpu)',
      operator: 'gt',
      threshold: 5,
      windowSeconds: 300,
      severity: 'warning',
    });
    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    await request(server).get('/dashboard');
    const res = await request(server).get('/alerts/events');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].ruleId).toBe('rule1');
    expect(res.body.data.items[0].observedValue).toBe(10);
  });

  it('filters events by rule_id', async () => {
    const server = app();
    for (const ruleId of ['rule1', 'rule2']) {
      await request(server).post('/alerts/rules').send({
        ruleId,
        name: `alert-${ruleId}`,
        enabled: true,
        query: 'avg(cpu)',
        operator: 'gt',
        threshold: 5,
        windowSeconds: 300,
        severity: 'warning',
      });
    }
    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    await request(server).get('/dashboard');
    const res = await request(server).get('/alerts/events?rule_id=rule2');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].ruleId).toBe('rule2');
  });
});

describe('GET /dashboard', () => {
  it('returns empty panels and alerts only on a fresh store', async () => {
    const res = await request(app()).get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.dashboardId).toBe('default');
    expect(res.body.data.panels).toHaveLength(0);
    expect(res.body.data.alerts).toHaveLength(0);
  });

  it('returns panels built from recorded series and alert state', async () => {
    const server = app();
    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 20 });
    await request(server).post('/metrics/counter').send({ name: 'reqs', value: 1 });
    await request(server).post('/alerts/rules').send({
      ruleId: 'rule1',
      name: 'high-cpu',
      enabled: true,
      query: 'avg(cpu)',
      operator: 'gt',
      threshold: 5,
      windowSeconds: 300,
      severity: 'warning',
    });
    const res = await request(server).get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.dashboardId).toBe('default');

    const panelIds = res.body.data.panels.map((p: { panelId: string }) => p.panelId).sort();
    expect(panelIds).toEqual(['counter_reqs', 'gauge_cpu']);

    const cpuPanel = res.body.data.panels.find((p: { panelId: string }) => p.panelId === 'gauge_cpu');
    expect(cpuPanel.points).toHaveLength(2);
    expect(cpuPanel.summary.last).toBe(20);
    expect(cpuPanel.summary.avg).toBe(15);

    const alerts = res.body.data.alerts as Array<{ ruleId: string; status: string; currentValue: number }>;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].ruleId).toBe('rule1');
    expect(alerts[0].status).toBe('firing');
    expect(alerts[0].currentValue).toBe(15);
  });

  it('filters panels by the panels query parameter', async () => {
    const server = app();
    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    await request(server).post('/metrics/counter').send({ name: 'reqs', value: 1 });
    const res = await request(server).get('/dashboard?panels=cpu');
    expect(res.status).toBe(200);
    expect(res.body.data.panels).toHaveLength(1);
    expect(res.body.data.panels[0].panelId).toBe('gauge_cpu');
  });

  it('returns histogram panels with bucket summary instead of points', async () => {
    const server = app();
    await request(server).post('/metrics/histogram').send({ name: 'lat', value: 0.1 });
    await request(server).post('/metrics/histogram').send({ name: 'lat', value: 0.3 });
    const res = await request(server).get('/dashboard');
    expect(res.status).toBe(200);
    const latPanel = res.body.data.panels.find((p: { panelId: string }) => p.panelId === 'histogram_lat');
    expect(latPanel).toBeDefined();
    expect(latPanel.points).toHaveLength(0);
    expect(latPanel.summary.count).toBe(2);
    expect(latPanel.summary.sum).toBeCloseTo(0.4, 5);
  });

  it('returns empty summaries when the time window matches no points', async () => {
    const server = app();
    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    const res = await request(server).get('/dashboard?start=2099-01-01T00:00:00.000Z');
    expect(res.status).toBe(200);
    const cpuPanel = res.body.data.panels.find((p: { panelId: string }) => p.panelId === 'gauge_cpu');
    expect(cpuPanel.points).toHaveLength(0);
    expect(cpuPanel.summary.last).toBeNull();
  });
});

describe('GET /health', () => {
  it('returns health with the real active series count', async () => {
    const server = app();
    const empty = await request(server).get('/health');
    expect(empty.status).toBe(200);
    expect(empty.body.ok).toBe(true);
    expect(empty.body.data.activeSeries).toBe(0);

    await request(server).post('/metrics/gauge').send({ name: 'cpu', value: 10 });
    await request(server).post('/metrics/counter').send({ name: 'reqs', value: 1 });
    const res = await request(server).get('/health');
    expect(res.body.data.activeSeries).toBe(2);
  });
});
