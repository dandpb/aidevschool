import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Gateway } from '../server';
import { defaultConfig } from '../config';

describe('Gateway', () => {
  it('should return 404 for unknown route', async () => {
    const gw = new Gateway(defaultConfig());
    const res = await request(gw.buildApp()).get('/unknown');
    expect(res.status).toBe(404);
  });

  it('should return status', async () => {
    const gw = new Gateway(defaultConfig());
    const res = await request(gw.buildApp()).get('/_gateway/status');
    expect(res.status).toBe(200);
    expect(res.body.routes).toBeDefined();
  });

  it('should return metrics', async () => {
    const gw = new Gateway(defaultConfig());
    const res = await request(gw.buildApp()).get('/_gateway/metrics');
    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
  });

  it('should rate limit tenant', async () => {
    const config = defaultConfig();
    config.routes[0].tenantLimit = { capacity: 1, refillPerSecond: 1 };
    const gw = new Gateway(config);
    const app = gw.buildApp();

    const res1 = await request(app).get('/api/orders').set('X-Tenant-ID', 't1');
    expect(res1.status).toBe(503);

    const res2 = await request(app).get('/api/orders').set('X-Tenant-ID', 't1');
    expect(res2.status).toBe(429);
  });

  it('should return fallback on open circuit', async () => {
    const config = defaultConfig();
    config.routes[0].circuitBreaker = {
      windowMs: 10000,
      minimumRequests: 1,
      failureRateThreshold: 0.1,
      openCooldownMs: 5000,
      halfOpenMaxProbes: 1,
      halfOpenSuccessesToClose: 1,
    };
    const gw = new Gateway(config);
    const cb = gw['circuits'].get('orders')!;
    cb.recordFailure();

    const res = await request(gw.buildApp()).get('/api/orders');
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('orders temporarily unavailable');
  });
});
