import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CreationRateLimiter, UrlStore } from '../core';
import { buildApp, clientKey } from '../server';
import { listenPort } from '../main';

describe('HTTP API contract', () => {
  it('creates a custom alias, redirects with 301, records stats, and deletes', async () => {
    const { app, store, analytics } = buildApp({ baseUrl: 'http://localhost:8081' });
    const created = await request(app).post('/shorten').send({ url: 'https://example.com/a', custom_alias: 'abc' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ code: 'abc', short_url: 'http://localhost:8081/abc', original_url: 'https://example.com/a' });
    const redirected = await request(app).get('/abc').set('x-forwarded-for', '203.0.113.1').redirects(0);
    expect(redirected.status).toBe(301);
    expect(redirected.header.location).toBe('https://example.com/a');
    analytics.drain();
    expect(store.stats('abc').total_clicks).toBe(1);
    const stats = await request(app).get('/abc/stats');
    expect(stats.status).toBe(200);
    expect(stats.body).toMatchObject({ total_clicks: 1 });
    const deleted = await request(app).delete('/abc');
    expect(deleted.status).toBe(204);
    const gone = await request(app).get('/abc');
    expect(gone.status).toBe(410);
    expect(gone.body).toMatchObject({ error: { code: 'code_deleted' } });
  });

  it('returns validation, conflict, pagination, health, and batch responses', async () => {
    const { app } = buildApp({ baseUrl: 'http://localhost:8081' });
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
    const invalid = await request(app).post('/shorten').send({ url: 'ftp://example.com', custom_alias: 'abc' });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({ error: { code: 'invalid_url' } });
    const first = await request(app).post('/shorten').send({ url: 'https://example.com/one', custom_alias: 'one' });
    expect(first.status).toBe(201);
    const conflict = await request(app).post('/shorten').send({ url: 'https://example.com/two', custom_alias: 'one' });
    expect(conflict.status).toBe(409);
    const batch = await request(app).post('/shorten/batch').send({ urls: [{ url: 'https://example.com/two', custom_alias: 'two' }, { url: 'file:///tmp/a' }] });
    expect(batch.status).toBe(207);
    expect(batch.text).toContain('"status":201');
    expect(batch.text).toContain('"error":"invalid_url"');
    const list = await request(app).get('/urls?limit=1');
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({ next_cursor: '1' });
    const badList = await request(app).get('/urls?limit=0');
    expect(badList.status).toBe(400);
    const emptyBatch = await request(app).post('/shorten/batch').send({ urls: [] });
    expect(emptyBatch.status).toBe(400);
  });

  it('rate limits create endpoints and exposes startup helpers', async () => {
    const { app } = buildApp({ rateLimiter: new CreationRateLimiter(1, 60_000), store: new UrlStore(), baseUrl: 'http://localhost:8081' });
    const first = await request(app).post('/shorten').send({ url: 'https://example.com/a', custom_alias: 'aaa' });
    expect(first.status).toBe(201);
    const limited = await request(app).post('/shorten').send({ url: 'https://example.com/b', custom_alias: 'bbb' });
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ error: { code: 'rate_limit_exceeded' } });
    expect(listenPort({ PORT: '9090' })).toBe(9090);
    expect(() => listenPort({ PORT: 'bad' })).toThrow();
  });

  it('derives client keys from forwarded headers or socket details', () => {
    const req = { header: (name: string) => (name === 'x-forwarded-for' ? '203.0.113.1, 10.0.0.1' : undefined), ip: '127.0.0.1', socket: {} } as Parameters<typeof clientKey>[0];
    expect(clientKey(req)).toBe('203.0.113.1');
  });
});
