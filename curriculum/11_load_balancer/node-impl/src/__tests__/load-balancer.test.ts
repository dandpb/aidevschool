import http, { Server } from 'node:http';
import { once } from 'node:events';
import { afterEach, describe, expect, it } from 'vitest';
import { LoadBalancer, defaultConfig } from '../load-balancer';

const servers: Server[] = [];

async function backend(name: string, status = 200): Promise<{ url: string; hits: string[]; close: () => Promise<void> }> {
  const hits: string[] = [];
  const server = http.createServer((req, res) => {
    if (req.url === '/health') { res.writeHead(status); res.end('ok'); return; }
    hits.push(`${req.method} ${req.url} ${req.headers['x-request-id'] ?? ''}`);
    res.setHeader('x-backend', name);
    res.end(name);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing port');
  return { url: `http://127.0.0.1:${address.port}`, hits, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

describe('Node load balancer', () => {
  it('round-robins only eligible healthy backends and applies weights', async () => {
    const lb = new LoadBalancer({ ...defaultConfig([{ id: 'a', url: 'http://a', weight: 2 }, { id: 'b', url: 'http://b', weight: 1 }]) });
    lb.markBackendHealthy('a'); lb.markBackendHealthy('b');
    expect([lb.selectBackend()?.id, lb.selectBackend()?.id, lb.selectBackend()?.id]).toEqual(['a', 'a', 'b']);
  });

  it('chooses least active connections with deterministic tie-breaking', () => {
    const lb = new LoadBalancer({ ...defaultConfig([{ id: 'b', url: 'http://b' }, { id: 'a', url: 'http://a' }]), routingAlgorithm: 'least_connections' });
    lb.markBackendHealthy('a'); lb.markBackendHealthy('b');
    expect(lb.selectBackend()?.id).toBe('a');
  });

  it('updates health and circuit breaker state from active and passive failures', async () => {
    const failing = await backend('bad', 500);
    const lb = new LoadBalancer({ ...defaultConfig([{ id: 'bad', url: failing.url }]), failureThreshold: 1 });
    await lb.checkBackend('bad');
    expect(lb.snapshots()[0]).toMatchObject({ health: 'unhealthy', circuitState: 'open' });
  });

  it('proxies method, path, query, headers, and exposes admin metrics', async () => {
    const a = await backend('a');
    const b = await backend('b');
    const lb = new LoadBalancer(defaultConfig([{ id: 'a', url: a.url }, { id: 'b', url: b.url }]));
    lb.markBackendHealthy('a'); lb.markBackendHealthy('b');
    const server = lb.listen(0);
    await once(server, 'listening');
    servers.push(server);
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('missing port');
    const base = `http://127.0.0.1:${address.port}`;
    const first = await fetch(`${base}/demo?x=1`, { method: 'POST', headers: { 'x-request-id': 'req-node' }, body: 'body' });
    const second = await fetch(`${base}/demo?x=2`);
    expect(await first.text()).toBe('a');
    expect(await second.text()).toBe('b');
    expect(a.hits[0]).toContain('POST /demo?x=1 req-node');
    const health = await (await fetch(`${base}/__lb/health`)).json();
    const metrics = await (await fetch(`${base}/__lb/metrics`)).json();
    expect(health.backendSummary.healthy).toBe(2);
    expect(metrics.requestsTotal).toBe(2);
    await lb.shutdown();
  });

  it('supports backend pool add/remove and rejects invalid config', () => {
    const lb = new LoadBalancer(defaultConfig([{ id: 'a', url: 'http://a' }]));
    lb.addBackend({ id: 'b', url: 'http://b', weight: 3 });
    expect(lb.removeBackend('a')).toBe(true);
    expect(lb.snapshots().map((b) => b.id)).toEqual(['b']);
    expect(() => new LoadBalancer(defaultConfig([]))).toThrow(/backend/);
    expect(() => lb.addBackend({ id: 'bad', url: 'ftp://bad' })).toThrow(/http/);
  });
});
